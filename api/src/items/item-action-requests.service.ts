import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemActionRequestType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { displayHandle } from '../common/user-display.util.js';
import { ItemsService } from './items.service.js';
import { TransfersService } from '../transfers/transfers.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { CreateItemActionRequestDto } from './dto/create-item-action-request.dto.js';

const REQUEST_EXPIRY_HOURS = 48; // Decisión del plan: más corto que los 7 días de Transfer/CollectionInvite.

const ACTION_LABELS: Record<ItemActionRequestType, string> = {
  TRANSFER: 'transferir',
  SELL: 'poner en venta',
  DELETE: 'eliminar',
};

// Autorización del dueño real para las 3 acciones de más peso sobre un objeto
// compartido (transferir/vender/eliminar): mismo molde que
// CollectionMembersService.inviteMember/acceptInvite/rejectInvite, pero el
// decisor es el dueño del objeto, no quien invita. Ver plan "Acceso
// compartido a objetos + autorización del dueño".
@Injectable()
export class ItemActionRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemsService: ItemsService,
    private readonly transfersService: TransfersService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(requestedByUserId: string, itemId: string, dto: CreateItemActionRequestDto) {
    const { item, role } = await this.itemsService.resolveItemAccess(requestedByUserId, itemId);
    if (role !== 'EDITOR') {
      throw new BadRequestException('Eres el dueño: usa la acción directa, no una solicitud de autorización');
    }
    if (dto.action === ItemActionRequestType.TRANSFER && !dto.toEmail) {
      throw new BadRequestException('Indica el correo del destinatario');
    }
    if (dto.action === ItemActionRequestType.SELL && dto.price === undefined) {
      throw new BadRequestException('Indica el precio al que quieres vender este objeto');
    }

    const pending = await this.prisma.itemActionRequest.findFirst({
      where: { itemId, action: dto.action, status: 'PENDING' },
    });
    if (pending) {
      throw new ConflictException('Ya hay una solicitud pendiente para esta acción sobre este objeto');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + REQUEST_EXPIRY_HOURS);

    const request = await this.prisma.itemActionRequest.create({
      data: {
        itemId,
        requestedByUserId,
        ownerId: item.ownerId,
        action: dto.action,
        toEmail: dto.action === ItemActionRequestType.TRANSFER ? dto.toEmail : undefined,
        price: dto.action === ItemActionRequestType.SELL ? dto.price : undefined,
        expiresAt,
      },
    });

    const requester = await this.prisma.user.findUniqueOrThrow({
      where: { id: requestedByUserId },
      select: { name: true, username: true },
    });
    this.notifications
      .sendPushToUser(item.ownerId, {
        title: 'Solicitud de autorización',
        body: `${displayHandle(requester)} quiere ${ACTION_LABELS[dto.action]} "${item.name}"`,
        data: { type: `item_action_request_${dto.action.toLowerCase()}`, itemId, requestId: request.id },
      })
      .catch(() => {});

    return request;
  }

  async accept(ownerId: string, requestId: string) {
    const request = await this.prisma.itemActionRequest.findUnique({ where: { id: requestId } });
    if (!request || request.ownerId !== ownerId) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Esta solicitud ya no está pendiente');
    }

    const owner = await this.prisma.user.findUniqueOrThrow({
      where: { id: ownerId },
      select: { name: true, username: true },
    });

    // Se ejecuta la acción real como el dueño, reusando los métodos existentes
    // sin relajar sus checks estrictos — si el objeto ya no está en estado
    // válido (p. ej. otra acción concurrente lo vendió), el error se propaga y
    // la solicitud sigue PENDING (expira sola o el dueño reintenta).
    if (request.action === ItemActionRequestType.TRANSFER) {
      await this.transfersService.initiate(
        ownerId,
        displayHandle(owner),
        { itemId: request.itemId, toUserEmail: request.toEmail! },
        { initiatedByUserId: request.requestedByUserId },
      );
    } else if (request.action === ItemActionRequestType.SELL) {
      await this.itemsService.setSale(ownerId, request.itemId, {
        status: 'FOR_SALE',
        price: request.price ? Number(request.price) : undefined,
      });
    } else {
      await this.itemsService.remove(ownerId, request.itemId);
    }

    await this.prisma.itemActionRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });

    this.notifications
      .sendPushToUser(request.requestedByUserId, {
        title: 'Solicitud autorizada',
        body: `${displayHandle(owner)} autorizó ${ACTION_LABELS[request.action]} tu objeto`,
        data: { type: 'item_action_request_accepted', itemId: request.itemId, requestId },
      })
      .catch(() => {});

    return { success: true };
  }

  async reject(ownerId: string, requestId: string) {
    const request = await this.prisma.itemActionRequest.findUnique({ where: { id: requestId } });
    if (!request || request.ownerId !== ownerId) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Esta solicitud ya no está pendiente');
    }

    await this.prisma.itemActionRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', respondedAt: new Date() },
    });

    const owner = await this.prisma.user.findUniqueOrThrow({
      where: { id: ownerId },
      select: { name: true, username: true },
    });
    const item = await this.prisma.item.findUnique({ where: { id: request.itemId }, select: { name: true } });
    this.notifications
      .sendPushToUser(request.requestedByUserId, {
        title: 'Solicitud rechazada',
        body: `${displayHandle(owner)} rechazó tu solicitud para ${ACTION_LABELS[request.action]} "${item?.name ?? 'el objeto'}"`,
        data: { type: 'item_action_request_rejected', itemId: request.itemId, requestId },
      })
      .catch(() => {});

    return { success: true };
  }

  // Alimenta la pantalla de "Notificaciones": solicitudes dirigidas a mí como
  // dueño, pendientes de aceptar/rechazar.
  listIncoming(ownerId: string) {
    return this.prisma.itemActionRequest.findMany({
      where: { ownerId, status: 'PENDING' },
      include: {
        item: { select: { id: true, name: true } },
        requestedByUser: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Solicitudes que yo mismo mandé, para ver su estado (pendiente/aceptada/rechazada/expirada).
  listOutgoing(userId: string) {
    return this.prisma.itemActionRequest.findMany({
      where: { requestedByUserId: userId },
      include: { item: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
