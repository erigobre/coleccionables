import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CollectionsService } from '../collections/collections.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { InitiateTransferDto } from './dto/initiate-transfer.dto.js';

const TRANSFER_EXPIRY_DAYS = 7; // Decisión confirmada: expira tras 7 días sin respuesta.

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collectionsService: CollectionsService,
    private readonly notifications: NotificationsService,
  ) {}

  async initiate(fromUserId: string, fromUserName: string, dto: InitiateTransferDto) {
    const item = await this.prisma.item.findUnique({ where: { id: dto.itemId } });
    if (!item || item.ownerId !== fromUserId) {
      throw new NotFoundException('Objeto no encontrado');
    }
    if (item.status !== 'ACTIVE') {
      throw new BadRequestException('Solo se pueden transferir objetos activos');
    }

    const toUser = await this.prisma.user.findUnique({ where: { email: dto.toUserEmail } });
    if (!toUser) {
      throw new NotFoundException('No existe un usuario con ese correo');
    }
    if (toUser.id === fromUserId) {
      throw new BadRequestException('No puedes transferirte un objeto a ti mismo');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TRANSFER_EXPIRY_DAYS);

    const [, transfer] = await this.prisma.$transaction([
      this.prisma.item.update({ where: { id: item.id }, data: { status: 'PENDING_TRANSFER' } }),
      this.prisma.transfer.create({
        data: {
          itemId: item.id,
          fromUserId,
          toUserId: toUser.id,
          expiresAt,
        },
      }),
    ]);

    this.notifications
      .sendPushToUser(toUser.id, {
        title: 'Nueva transferencia',
        body: `${fromUserName} te envió "${item.name}". Revisa tus transferencias.`,
        data: { type: 'transfer', transferId: transfer.id },
      })
      .catch(() => {});

    return transfer;
  }

  async accept(toUserId: string, transferId: string, targetCollectionId: string) {
    const transfer = await this.assertPendingTransferForReceiver(toUserId, transferId);
    await this.collectionsService.assertCanAddItems(toUserId, targetCollectionId);

    const originalItem = await this.prisma.item.findUniqueOrThrow({
      where: { id: transfer.itemId },
      include: { photos: true },
    });

    return this.prisma.$transaction(async (tx) => {
      await tx.transfer.update({
        where: { id: transfer.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });

      // Registro original queda inmutable como "vendido" (plan §7.3); se crea un
      // objeto nuevo e independiente para el receptor (no se reactiva el vendido).
      await tx.item.update({ where: { id: originalItem.id }, data: { status: 'SOLD' } });

      const newItem = await tx.item.create({
        data: {
          ownerId: toUserId,
          name: originalItem.name,
          category: originalItem.category,
          packagingCondition: originalItem.packagingCondition,
          usageState: originalItem.usageState,
          conservationState: originalItem.conservationState,
          brand: originalItem.brand,
          toyLine: originalItem.toyLine,
          edition: originalItem.edition,
          scale: originalItem.scale,
          designer: originalItem.designer,
          releaseYear: originalItem.releaseYear,
          originalSetNumber: originalItem.originalSetNumber,
          uniqueIdentifier: originalItem.uniqueIdentifier,
          comicCoverNumber: originalItem.comicCoverNumber,
          comicIssueNumber: originalItem.comicIssueNumber,
          comicWriter: originalItem.comicWriter,
          comicPenciler: originalItem.comicPenciler,
          comicInker: originalItem.comicInker,
          comicColorist: originalItem.comicColorist,
          comicPublisher: originalItem.comicPublisher,
          quantity: originalItem.quantity,
          notes: originalItem.notes,
          status: 'ACTIVE',
          photos: {
            create: originalItem.photos.map((photo) => ({ url: photo.url, order: photo.order })),
          },
          collections: { create: [{ collectionId: targetCollectionId }] },
        },
      });

      return newItem;
    });
  }

  async reject(toUserId: string, transferId: string) {
    const transfer = await this.assertPendingTransferForReceiver(toUserId, transferId);

    await this.prisma.$transaction([
      this.prisma.transfer.update({
        where: { id: transfer.id },
        data: { status: 'REJECTED', respondedAt: new Date() },
      }),
      this.prisma.item.update({ where: { id: transfer.itemId }, data: { status: 'ACTIVE' } }),
    ]);
  }

  // El remitente se arrepiente (o se equivocó de correo) antes de que el receptor
  // responda. Se borra la transferencia pendiente en vez de marcarla con un estado
  // nuevo: para el historial nunca ocurrió, y el objeto vuelve a estar activo.
  async cancel(fromUserId: string, transferId: string) {
    const transfer = await this.prisma.transfer.findUnique({ where: { id: transferId } });
    if (!transfer || transfer.fromUserId !== fromUserId) {
      throw new NotFoundException('Transferencia no encontrada');
    }
    if (transfer.status !== 'PENDING') {
      throw new ForbiddenException('Esta transferencia ya fue respondida o expiró');
    }

    await this.prisma.$transaction([
      this.prisma.transfer.delete({ where: { id: transfer.id } }),
      this.prisma.item.update({ where: { id: transfer.itemId }, data: { status: 'ACTIVE' } }),
    ]);
  }

  // Nunca incluir el User completo: trae passwordHash. El receptor solo ve el
  // nombre del remitente; el remitente ya conoce el correo al que transfirió.
  findIncoming(userId: string) {
    return this.prisma.transfer.findMany({
      where: { toUserId: userId, status: 'PENDING' },
      include: {
        item: { include: { photos: { orderBy: { order: 'asc' }, take: 1 } } },
        fromUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOutgoing(userId: string) {
    return this.prisma.transfer.findMany({
      where: { fromUserId: userId },
      include: {
        item: { include: { photos: { orderBy: { order: 'asc' }, take: 1 } } },
        toUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Ejecutado por un cron (ver TransfersCronService): expira transferencias
  // pendientes sin respuesta tras 7 días y devuelve el objeto a ACTIVE.
  async expireOverdueTransfers() {
    const overdue = await this.prisma.transfer.findMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
    });

    for (const transfer of overdue) {
      await this.prisma.$transaction([
        this.prisma.transfer.update({
          where: { id: transfer.id },
          data: { status: 'EXPIRED', respondedAt: new Date() },
        }),
        this.prisma.item.update({ where: { id: transfer.itemId }, data: { status: 'ACTIVE' } }),
      ]);
    }

    return overdue.length;
  }

  private async assertPendingTransferForReceiver(toUserId: string, transferId: string) {
    const transfer = await this.prisma.transfer.findUnique({ where: { id: transferId } });
    if (!transfer || transfer.toUserId !== toUserId) {
      throw new NotFoundException('Transferencia no encontrada');
    }
    if (transfer.status !== 'PENDING') {
      throw new ForbiddenException('Esta transferencia ya fue respondida o expiró');
    }
    return transfer;
  }
}
