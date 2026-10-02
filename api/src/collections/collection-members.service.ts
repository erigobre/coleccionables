import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LocationsService } from '../locations/locations.service.js';
import { FtService } from '../ft/ft.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { TransfersService } from '../transfers/transfers.service.js';
import { CollectionsService } from './collections.service.js';
import type { InviteMemberDto } from './dto/invite-member.dto.js';
import { RemoveMemberDto, RemoveMemberMode } from './dto/remove-member.dto.js';

const MAX_MEMBERS_FALLBACK = 5;

// Gestión del "grupo familiar" de una colección compartida: invitar/aceptar
// (CollectionMember), listar miembros y expulsar (con las dos modalidades que
// pidió el usuario: sacar los objetos de inmediato, o pedirle al expulsado que
// los transfiera a otro miembro antes de salir). Ver plan §3.
@Injectable()
export class CollectionMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationsService: LocationsService,
    private readonly ftService: FtService,
    private readonly notifications: NotificationsService,
    private readonly transfersService: TransfersService,
    private readonly collectionsService: CollectionsService,
  ) {}

  async inviteMember(ownerId: string, collectionId: string, dto: InviteMemberDto) {
    const collection = await this.collectionsService.assertOwnerRole(ownerId, collectionId);

    const invitee = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (!invitee) {
      throw new NotFoundException('No existe ningún usuario con ese @usuario');
    }
    if (invitee.id === ownerId) {
      throw new BadRequestException('No puedes invitarte a ti mismo');
    }

    const existingMember = await this.prisma.collectionMember.findUnique({
      where: { collectionId_userId: { collectionId, userId: invitee.id } },
    });
    if (existingMember) {
      throw new BadRequestException('Ese usuario ya es miembro de esta colección');
    }

    await this.ensureOwnerMembership(ownerId, collectionId);
    await this.assertUnderMemberCap(collectionId);

    const inviter = await this.prisma.user.findUniqueOrThrow({ where: { id: ownerId }, select: { name: true } });
    this.notifications
      .sendPushToUser(invitee.id, {
        title: 'Invitación a colección compartida',
        body: `${inviter.name} te invitó a unirte a "${collection.name}"`,
        data: { type: 'collection_invite', collectionId, collectionName: collection.name },
      })
      .catch(() => {});

    return { invited: true };
  }

  async acceptInvite(userId: string, collectionId: string) {
    const collection = await this.prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) {
      throw new NotFoundException('Colección no encontrada');
    }

    const existing = await this.prisma.collectionMember.findUnique({
      where: { collectionId_userId: { collectionId, userId } },
    });
    if (existing) return existing;

    await this.ensureOwnerMembership(collection.ownerId, collectionId);
    await this.assertUnderMemberCap(collectionId);

    const member = await this.prisma.collectionMember.create({ data: { collectionId, userId, role: 'EDITOR' } });

    if (collection.ownerId !== userId) {
      const joined = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
      this.notifications
        .sendPushToUser(collection.ownerId, {
          title: 'Invitación aceptada',
          body: `${joined.name} se unió a "${collection.name}"`,
          data: { type: 'collection_joined', collectionId },
        })
        .catch(() => {});
    }

    return member;
  }

  async listMembers(userId: string, collectionId: string) {
    const collection = await this.collectionsService.assertCanManageItems(userId, collectionId);
    // El OWNER solo tiene una fila real en CollectionMember a partir de la
    // primera invitación/aceptación (ver ensureOwnerMembership): si nadie ha
    // invitado todavía, hay que sembrarla aquí para que no aparezca "sin
    // miembros" en una colección que sí tiene dueño.
    await this.ensureOwnerMembership(collection.ownerId, collectionId);
    return this.prisma.collectionMember.findMany({
      where: { collectionId },
      select: {
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Alimenta el modal de expulsión: "fulano tiene N objetos en M ubicaciones".
  async getRemovalPreview(ownerId: string, collectionId: string, memberUserId: string) {
    await this.collectionsService.assertOwnerRole(ownerId, collectionId);
    const links = await this.prisma.itemCollection.findMany({
      where: { collectionId, item: { ownerId: memberUserId } },
      select: { item: { select: { currentLocationId: true } } },
    });
    const locationIds = new Set(links.map((l) => l.item.currentLocationId).filter((v): v is string => v != null));
    return { itemCount: links.length, locationCount: locationIds.size };
  }

  async removeMember(ownerId: string, collectionId: string, memberUserId: string, dto: RemoveMemberDto) {
    const collection = await this.collectionsService.assertOwnerRole(ownerId, collectionId);
    if (memberUserId === ownerId) {
      throw new BadRequestException('El dueño no puede expulsarse a sí mismo');
    }

    const member = await this.prisma.collectionMember.findUnique({
      where: { collectionId_userId: { collectionId, userId: memberUserId } },
    });
    if (!member) {
      throw new NotFoundException('Ese usuario no es miembro de esta colección');
    }

    const owner = await this.prisma.user.findUniqueOrThrow({ where: { id: ownerId }, select: { name: true } });

    const links = await this.prisma.itemCollection.findMany({
      where: { collectionId, item: { ownerId: memberUserId } },
      select: { itemId: true, item: { select: { status: true } } },
    });

    if (dto.mode === RemoveMemberMode.DETACH) {
      await this.prisma.itemCollection.deleteMany({ where: { collectionId, item: { ownerId: memberUserId } } });
      await this.prisma.collectionMember.delete({ where: { collectionId_userId: { collectionId, userId: memberUserId } } });
      await Promise.all(links.map((l) => this.locationsService.syncInheritedLocationAccess(l.itemId)));
      this.notifications
        .sendPushToUser(memberUserId, {
          title: 'Saliste de una colección compartida',
          body: `${owner.name} te sacó de "${collection.name}"${
            links.length ? ` y ${links.length === 1 ? '1 objeto se desvinculó' : `${links.length} objetos se desvincularon`}` : ''
          }.`,
          data: { type: 'collection_removed', collectionId },
        })
        .catch(() => {});
      return { mode: RemoveMemberMode.DETACH, itemsDetached: links.length };
    }

    if (!dto.transferToUserId) {
      throw new BadRequestException('Debes indicar a quién se transferirán los objetos');
    }
    const recipientIsMember = await this.prisma.collectionMember.findUnique({
      where: { collectionId_userId: { collectionId, userId: dto.transferToUserId } },
    });
    const recipient = await this.prisma.user.findUnique({ where: { id: dto.transferToUserId } });
    if (!recipient || !recipientIsMember) {
      throw new BadRequestException('El destinatario debe ser miembro de la colección');
    }

    const memberUser = await this.prisma.user.findUniqueOrThrow({ where: { id: memberUserId }, select: { name: true } });
    const transferableIds = links.filter((l) => l.item.status === 'ACTIVE').map((l) => l.itemId);
    // Lo que no esté ACTIVE (ya en otra transferencia, vendido, etc.) no se puede
    // ofrecer ahora mismo: se resuelve como expulsión simple para esos objetos.
    const nonTransferableIds = links.filter((l) => l.item.status !== 'ACTIVE').map((l) => l.itemId);

    for (const itemId of transferableIds) {
      await this.transfersService.initiate(
        memberUserId,
        memberUser.name,
        { itemId, toUserEmail: recipient.email },
        { initiatedByUserId: ownerId, initiatedFromCollectionId: collectionId },
      );
    }
    if (nonTransferableIds.length) {
      await this.prisma.itemCollection.deleteMany({ where: { collectionId, itemId: { in: nonTransferableIds } } });
    }

    await this.prisma.collectionMember.delete({ where: { collectionId_userId: { collectionId, userId: memberUserId } } });
    await Promise.all(links.map((l) => this.locationsService.syncInheritedLocationAccess(l.itemId)));

    this.notifications
      .sendPushToUser(memberUserId, {
        title: 'Saliste de una colección compartida',
        body: `${owner.name} te sacó de "${collection.name}"${
          transferableIds.length
            ? `. Se solicitó transferir ${transferableIds.length === 1 ? '1 objeto' : `${transferableIds.length} objetos`} a ${recipient.name}`
            : ''
        }.`,
        data: { type: 'collection_removed', collectionId },
      })
      .catch(() => {});

    return { mode: RemoveMemberMode.TRANSFER, itemsOffered: transferableIds.length, itemsDetached: nonTransferableIds.length };
  }

  private async ensureOwnerMembership(ownerId: string, collectionId: string) {
    await this.prisma.collectionMember.upsert({
      where: { collectionId_userId: { collectionId, userId: ownerId } },
      create: { collectionId, userId: ownerId, role: 'OWNER' },
      update: {},
    });
  }

  private async assertUnderMemberCap(collectionId: string) {
    const [count, maxMembers] = await Promise.all([
      this.prisma.collectionMember.count({ where: { collectionId } }),
      this.ftService.getConfigValue('MAX_MEMBERS_PER_SHARED_COLLECTION', MAX_MEMBERS_FALLBACK),
    ]);
    if (count >= maxMembers) {
      throw new BadRequestException(`Esta colección ya alcanzó el máximo de ${maxMembers} miembros`);
    }
  }
}
