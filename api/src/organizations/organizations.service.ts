import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { EmailService } from '../email/email.service.js';
import type { InviteMemberDto } from '../auth/dto/invite-member.dto.js';

const SALT_ROUNDS = 10;
const ACTIVE_SUBSCRIPTION_STATUSES = ['ACTIVE', 'SPONSORED'] as const;

function hasActiveSubscription(organization: { activeFtPlanId: string | null; subscriptionStatus: string }): boolean {
  return (
    organization.activeFtPlanId !== null &&
    (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(organization.subscriptionStatus)
  );
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  async getMyOrganization(userId: string) {
    const caller = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: caller.organizationId },
      include: {
        activeFtPlan: true,
        users: { select: { id: true, name: true, username: true, avatarUrl: true, role: true } },
      },
    });

    return {
      id: organization.id,
      name: organization.name,
      subscriptionStatus: organization.subscriptionStatus,
      sponsored: organization.sponsored,
      activeFtPlan: organization.activeFtPlan,
      members: organization.users,
      myRole: caller.role,
    };
  }

  // Única salida real mientras no haya cobro (decisión #6 del plan de
  // Ajustes): necesaria para que "cancela tu suscripción antes de unirte a
  // otra familia" tenga un botón de verdad.
  async cancelSubscription(userId: string) {
    const caller = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (caller.role !== 'OWNER') {
      throw new ForbiddenException('Solo el dueño de la cuenta puede cancelar la suscripción');
    }

    await this.prisma.organization.update({
      where: { id: caller.organizationId },
      data: { subscriptionStatus: 'CANCELED', activeFtPlanId: null },
    });

    return { success: true };
  }

  // El OWNER llena el mismo formulario en los dos casos; el backend decide si
  // crea la cuenta de una vez o manda una invitación que la otra persona debe
  // aceptar, según si ese correo ya tiene cuenta (decisión #4 del plan).
  async inviteOrCreateMember(ownerId: string, dto: InviteMemberDto) {
    const owner = await this.prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
    if (owner.role !== 'OWNER') {
      throw new ForbiddenException('Solo el dueño de la cuenta puede invitar familiares');
    }

    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: owner.organizationId },
      include: { activeFtPlan: true, users: { select: { id: true } } },
    });

    if (!hasActiveSubscription(organization) || !organization.activeFtPlan) {
      throw new ForbiddenException('Necesitas una suscripción activa para invitar familiares');
    }

    const maxMembers = 1 + organization.activeFtPlan.maxInvitedMembers;
    if (organization.users.length >= maxMembers) {
      throw new ForbiddenException(`Tu plan permite hasta ${maxMembers} personas en tu familia`);
    }

    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email, status: 'ACTIVE' } });

    if (!existing) {
      const passwordHash = await bcrypt.hash(dto.temporaryPassword, SALT_ROUNDS);
      const created = await this.prisma.user.create({
        data: {
          organizationId: organization.id,
          email,
          passwordHash,
          name: dto.name,
          role: 'MEMBER',
        },
      });

      this.emailService
        .sendMemberAccountCreatedEmail({
          toEmail: created.email,
          userName: created.name,
          temporaryPassword: dto.temporaryPassword,
          inviterName: owner.name,
          organizationName: organization.name,
        })
        .catch(() => {});

      return { created: true, invited: false, userId: created.id };
    }

    if (existing.organizationId === organization.id) {
      throw new ConflictException('Esa persona ya es parte de tu familia');
    }

    const pendingInvite = await this.prisma.organizationInvite.findFirst({
      where: { organizationId: organization.id, targetUserId: existing.id, status: 'PENDING' },
    });
    if (pendingInvite) {
      throw new ConflictException('Ya tienes una invitación pendiente para esa persona');
    }

    const invite = await this.prisma.organizationInvite.create({
      data: { organizationId: organization.id, invitedByUserId: ownerId, targetUserId: existing.id },
    });

    this.notifications
      .sendPushToUser(existing.id, {
        title: 'Invitación a familia de FrikiTokens',
        body: `${owner.name} te invitó a compartir su suscripción en Frikidex`,
        data: { type: 'organization_invite', inviteId: invite.id },
      })
      .catch(() => {});
    this.emailService
      .sendOrganizationInviteEmail({ toEmail: existing.email, inviterName: owner.name, organizationName: organization.name })
      .catch(() => {});

    return { created: false, invited: true, inviteId: invite.id };
  }

  listMyInvites(userId: string) {
    return this.prisma.organizationInvite.findMany({
      where: { targetUserId: userId, status: 'PENDING' },
      include: {
        organization: { select: { name: true } },
        invitedByUser: { select: { name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptInvite(userId: string, inviteId: string) {
    const invite = await this.prisma.organizationInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.targetUserId !== userId || invite.status !== 'PENDING') {
      throw new NotFoundException('Invitación no encontrada');
    }

    const invitee = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { organization: { include: { users: true } } },
    });

    // Regla: no puede aceptar mientras su propia suscripción esté activa (debe
    // cancelarla primero), ni mientras tenga a otros familiares dependiendo
    // de él (no se puede abandonar a la propia familia sin dueño).
    if (hasActiveSubscription(invitee.organization)) {
      throw new ForbiddenException('Cancela tu propia suscripción antes de unirte a otra familia');
    }
    if (invitee.organization.users.length > 1) {
      throw new ForbiddenException('No puedes unirte a otra familia mientras tengas tus propios familiares');
    }

    const inviterOrg = await this.prisma.organization.findUniqueOrThrow({
      where: { id: invite.organizationId },
      include: { activeFtPlan: true, users: true },
    });

    if (!hasActiveSubscription(inviterOrg) || !inviterOrg.activeFtPlan) {
      throw new ForbiddenException('Esa familia ya no tiene una suscripción activa');
    }
    const maxMembers = 1 + inviterOrg.activeFtPlan.maxInvitedMembers;
    if (inviterOrg.users.length >= maxMembers) {
      throw new ForbiddenException('Esa familia ya llegó a su tope de integrantes');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { organizationId: invite.organizationId, role: 'MEMBER' } }),
      this.prisma.organizationInvite.update({ where: { id: inviteId }, data: { status: 'ACCEPTED', respondedAt: new Date() } }),
    ]);

    this.notifications
      .sendPushToUser(invite.invitedByUserId, {
        title: 'Invitación aceptada',
        body: `${invitee.name} aceptó unirse a tu familia de FrikiTokens`,
        data: { type: 'organization_invite_accepted', inviteId },
      })
      .catch(() => {});

    return { success: true };
  }

  async rejectInvite(userId: string, inviteId: string) {
    const invite = await this.prisma.organizationInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.targetUserId !== userId || invite.status !== 'PENDING') {
      throw new NotFoundException('Invitación no encontrada');
    }

    await this.prisma.organizationInvite.update({
      where: { id: inviteId },
      data: { status: 'REJECTED', respondedAt: new Date() },
    });

    this.notifications
      .sendPushToUser(invite.invitedByUserId, {
        title: 'Invitación rechazada',
        body: 'Tu invitación a la familia de FrikiTokens fue rechazada',
        data: { type: 'organization_invite_rejected', inviteId },
      })
      .catch(() => {});

    return { success: true };
  }

  // Al expulsar, se le crea una Organization propia nueva (mismo patrón que
  // AuthService.register) para que nunca quede sin Organization. Su saldo
  // personal (gratis/comprado) no se toca: vive en FtLot.userId, sigue a la
  // persona sin importar su Organization.
  async removeMember(ownerId: string, memberUserId: string) {
    const owner = await this.prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
    if (owner.role !== 'OWNER') {
      throw new ForbiddenException('Solo el dueño de la cuenta puede expulsar familiares');
    }
    if (memberUserId === ownerId) {
      throw new BadRequestException('No puedes expulsarte a ti mismo');
    }

    const member = await this.prisma.user.findUnique({ where: { id: memberUserId } });
    if (!member || member.organizationId !== owner.organizationId) {
      throw new NotFoundException('Ese familiar no existe en tu cuenta');
    }

    const newOrganization = await this.prisma.organization.create({
      data: { name: `Monedero de ${member.username ?? member.name}` },
    });
    await this.prisma.user.update({
      where: { id: memberUserId },
      data: { organizationId: newOrganization.id, role: 'OWNER' },
    });

    this.notifications
      .sendPushToUser(memberUserId, {
        title: 'Saliste de la familia de FrikiTokens',
        body: `${owner.name} te quitó de su familia de FrikiTokens`,
        data: { type: 'organization_member_removed' },
      })
      .catch(() => {});

    return { success: true };
  }
}
