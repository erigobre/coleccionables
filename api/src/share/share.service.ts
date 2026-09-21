import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { renderNotAvailablePage, renderSharedItemPage, type SharedItemView } from './share.page.js';

// Solo estos estados se muestran públicamente: un objeto vendido, donado o perdido
// ya no es del dueño que compartió el enlace.
const SHAREABLE_STATUSES = ['ACTIVE', 'PENDING_TRANSFER'];

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

  // Perfil simplificado (plan §5.3.4): nada de precio, notas, ubicación, lugar de
  // compra ni datos del dueño.
  async renderPublicPage(token: string, baseUrl: string): Promise<{ status: number; html: string }> {
    const link = await this.prisma.shareLink.findUnique({
      where: { token },
      include: {
        item: {
          select: {
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
            photos: { orderBy: { order: 'asc' }, select: { url: true } },
          },
        },
      },
    });

    if (!link || !SHAREABLE_STATUSES.includes(link.item.status)) {
      return { status: 404, html: renderNotAvailablePage() };
    }

    const view: SharedItemView = { ...link.item, photoUrls: link.item.photos.map((p) => p.url) };
    return { status: 200, html: renderSharedItemPage(view, `${baseUrl}/s/${link.token}`, baseUrl) };
  }
}
