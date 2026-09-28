import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  renderNotAvailablePage,
  renderSharedCollectionPage,
  renderSharedItemPage,
  type SharedItemView,
} from './share.page.js';

// Solo estos estados se muestran públicamente: un objeto vendido, donado o perdido
// ya no es del dueño que compartió el enlace.
const SHAREABLE_STATUSES: ('ACTIVE' | 'PENDING_TRANSFER')[] = ['ACTIVE', 'PENDING_TRANSFER'];

// Máximo de objetos en la cuadrícula pública de una colección.
const MAX_COLLECTION_TILES = 500;

// Campos públicos de un objeto (plan §5.3.4): nada de precio de compra, notas,
// ubicación, lugar de compra ni datos del dueño.
const ITEM_VIEW_SELECT = {
  name: true,
  category: true,
  status: true,
  packagingCondition: true,
  usageState: true,
  conservationState: true,
  brand: true,
  toyLine: true,
  edition: true,
  scale: true,
  designer: true,
  releaseYear: true,
  saleStatus: true,
  salePrice: true,
  currency: true,
  photos: { orderBy: { order: 'asc' as const }, select: { url: true } },
};

interface RawItemView {
  name: string;
  category: string;
  status: string;
  packagingCondition: string;
  usageState: string;
  conservationState: string | null;
  brand: string | null;
  toyLine: string | null;
  edition: string | null;
  scale: string | null;
  designer: string | null;
  releaseYear: number | null;
  saleStatus: 'FOR_SALE' | 'RESERVED' | 'SOLD' | null;
  salePrice: { toString(): string } | null;
  currency: string;
  photos: { url: string }[];
}

// Precio de venta: solo con "en venta" o "apartado"; vendido nunca lo muestra.
function toItemView(item: RawItemView): SharedItemView {
  const showPrice = item.saleStatus !== 'SOLD' && item.salePrice !== null;
  return {
    ...item,
    salePrice: showPrice && item.salePrice !== null ? Number(item.salePrice) : null,
    photoUrls: item.photos.map((p) => p.url),
  };
}

@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) {}

  // Devuelve el enlace existente o crea uno; compartir dos veces no genera dos URLs.
  async getOrCreate(ownerId: string, itemId: string) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.ownerId !== ownerId) {
      throw new NotFoundException('Objeto no encontrado');
    }

    const existing = await this.prisma.shareLink.findUnique({ where: { itemId } });
    if (existing) return { token: existing.token };

    // Token aleatorio criptográfico; el cuid por defecto es predecible en parte.
    const link = await this.prisma.shareLink.create({
      data: { itemId, token: randomBytes(18).toString('base64url') },
    });
    return { token: link.token };
  }

  async revoke(ownerId: string, itemId: string) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.ownerId !== ownerId) {
      throw new NotFoundException('Objeto no encontrado');
    }
    await this.prisma.shareLink.deleteMany({ where: { itemId } });
  }

  // Perfil simplificado (plan §5.3.4).
  async renderPublicPage(token: string, baseUrl: string): Promise<{ status: number; html: string }> {
    const link = await this.prisma.shareLink.findUnique({
      where: { token },
      include: { item: { select: ITEM_VIEW_SELECT } },
    });

    if (!link || !SHAREABLE_STATUSES.includes(link.item.status as 'ACTIVE' | 'PENDING_TRANSFER')) {
      return { status: 404, html: renderNotAvailablePage() };
    }

    return {
      status: 200,
      html: renderSharedItemPage(toItemView(link.item), `${baseUrl}/s/${link.token}`, baseUrl),
    };
  }

  // -------------------------------------------------------------------------
  // Colección completa
  // -------------------------------------------------------------------------

  async getOrCreateForCollection(ownerId: string, collectionId: string) {
    await this.assertOwnedCollection(ownerId, collectionId);
    const existing = await this.prisma.collectionShareLink.findUnique({ where: { collectionId } });
    if (existing) return { token: existing.token };
    const link = await this.prisma.collectionShareLink.create({
      data: { collectionId, token: randomBytes(18).toString('base64url') },
    });
    return { token: link.token };
  }

  async getCollectionLink(ownerId: string, collectionId: string) {
    await this.assertOwnedCollection(ownerId, collectionId);
    const link = await this.prisma.collectionShareLink.findUnique({ where: { collectionId } });
    return { token: link?.token ?? null };
  }

  async revokeForCollection(ownerId: string, collectionId: string) {
    await this.assertOwnedCollection(ownerId, collectionId);
    await this.prisma.collectionShareLink.deleteMany({ where: { collectionId } });
  }

  // Cuadrícula pública: los objetos se leen en vivo (lo que entra o sale de la
  // colección se refleja solo). Sin datos privados, igual que la página de un objeto.
  async renderCollectionPage(token: string, baseUrl: string): Promise<{ status: number; html: string }> {
    const link = await this.findActiveCollectionLink(token);
    if (!link) return { status: 404, html: renderNotAvailablePage('collection') };

    const items = await this.prisma.item.findMany({
      where: {
        status: { in: SHAREABLE_STATUSES },
        collections: { some: { collectionId: link.collectionId } },
      },
      select: { id: true, ...ITEM_VIEW_SELECT },
      orderBy: { createdAt: 'desc' },
      take: MAX_COLLECTION_TILES,
    });

    return {
      status: 200,
      html: renderSharedCollectionPage(
        {
          name: link.collection.name,
          ownerUsername: link.collection.owner.username,
          tiles: items.map((item) => {
            const view = toItemView(item);
            return {
              id: item.id,
              name: view.name,
              photoUrl: view.photoUrls[0] ?? null,
              saleStatus: view.saleStatus,
              salePrice: view.salePrice,
              currency: view.currency,
            };
          }),
        },
        `${baseUrl}/c/${link.token}`,
        baseUrl,
        `/c/${link.token}`,
      ),
    };
  }

  // Un objeto visto a través del enlace de su colección: no necesita enlace propio.
  async renderCollectionItemPage(
    token: string,
    itemId: string,
    baseUrl: string,
  ): Promise<{ status: number; html: string }> {
    const link = await this.findActiveCollectionLink(token);
    if (!link) return { status: 404, html: renderNotAvailablePage('collection') };

    const item = await this.prisma.item.findFirst({
      where: {
        id: itemId,
        status: { in: SHAREABLE_STATUSES },
        collections: { some: { collectionId: link.collectionId } },
      },
      select: ITEM_VIEW_SELECT,
    });
    if (!item) return { status: 404, html: renderNotAvailablePage('collection') };

    return {
      status: 200,
      html: renderSharedItemPage(toItemView(item), `${baseUrl}/c/${link.token}/${itemId}`, baseUrl, {
        url: `/c/${link.token}`,
        label: `← ${link.collection.name}`,
      }),
    };
  }

  // Una colección suspendida (o vacía de "En Venta") deja de abrirse.
  private findActiveCollectionLink(token: string) {
    return this.prisma.collectionShareLink.findFirst({
      where: { token, collection: { status: 'ACTIVE' } },
      include: { collection: { select: { name: true, owner: { select: { username: true } } } } },
    });
  }

  private async assertOwnedCollection(ownerId: string, collectionId: string) {
    const collection = await this.prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection || collection.ownerId !== ownerId) {
      throw new NotFoundException('Colección no encontrada');
    }
  }
}
