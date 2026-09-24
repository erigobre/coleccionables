import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FtService } from '../ft/ft.service.js';
import type { CreatePaymentDto } from './dto/create-payment.dto.js';
import type { ResolveModerationFlagDto } from './dto/resolve-moderation-flag.dto.js';

const ACTIVE_WINDOW_DAYS = 30;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ftService: FtService,
  ) {}

  // Listado de usuarios + búsqueda (plan §5.6, Fase 9).
  findUsers(search?: string) {
    return this.prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true, plan: true, subscriptionStatus: true, sponsored: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOrganizations() {
    return this.prisma.organization.findMany({
      include: {
        _count: { select: { users: true } },
        payments: { orderBy: { periodStart: 'desc' }, take: 12 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Activa/desactiva cuenta patrocinada: nunca paga (plan §2).
  async setSponsored(organizationId: string, sponsored: boolean) {
    await this.assertOrganizationExists(organizationId);
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        sponsored,
        subscriptionStatus: sponsored ? 'SPONSORED' : 'ACTIVE',
      },
    });
  }

  // Otorga FT manualmente (soporte/pruebas): usa el mismo FtService.grant()
  // que el cron de regalo mensual, con idempotencyKey única por llamada.
  async grantFt(organizationId: string, amount: number) {
    await this.assertOrganizationExists(organizationId);
    return this.ftService.grant({
      organizationId,
      source: 'PROMO',
      amount,
      idempotencyKey: `admin-grant-${organizationId}-${randomUUID()}`,
    });
  }

  async addPayment(organizationId: string, dto: CreatePaymentDto) {
    await this.assertOrganizationExists(organizationId);
    return this.prisma.payment.create({
      data: {
        organizationId,
        amount: dto.amount,
        currency: dto.currency ?? 'MXN',
        status: dto.status ?? 'PENDING',
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
      },
    });
  }

  // KPIs del dashboard (plan §5.6.2): set exacto quedó abierto a definir, se
  // cubre lo explícitamente pedido: objetos, colecciones, escaneos IA/mes, usuarios activos.
  async getStats() {
    const since = new Date();
    since.setDate(since.getDate() - ACTIVE_WINDOW_DAYS);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [totalUsers, totalOrganizations, totalItems, totalCollections, aiScansThisMonth, activeUsers] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.organization.count(),
        this.prisma.item.count(),
        this.prisma.collection.count(),
        this.prisma.usageEvent.count({ where: { type: 'AI_SCAN', createdAt: { gte: monthStart } } }),
        this.prisma.usageEvent.findMany({
          where: { createdAt: { gte: since } },
          select: { userId: true },
          distinct: ['userId'],
        }),
      ]);

    return {
      totalUsers,
      totalOrganizations,
      totalItems,
      totalCollections,
      aiScansThisMonth,
      activeUsersLast30Days: activeUsers.length,
    };
  }

  // "Reportes" de moderación (plan de bloqueo de contenido no apto, confirmado
  // con el owner 2026-09-22): el reporte vive como cola de revisión interna
  // aquí; un reporte externo (ej. NCMEC para CSAM real) es una decisión legal
  // que le corresponde al owner tomar caso por caso, no algo que se automatiza.
  findModerationFlags(reviewed?: boolean) {
    return this.prisma.moderationFlag.findMany({
      where: reviewed === undefined ? undefined : { reviewedAt: reviewed ? { not: null } : null },
      include: { user: { select: { id: true, name: true, email: true, username: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveModerationFlag(id: string, adminId: string, dto: ResolveModerationFlagDto) {
    const flag = await this.prisma.moderationFlag.findUnique({ where: { id } });
    if (!flag) {
      throw new NotFoundException('Incidente de moderación no encontrado');
    }

    const updated = await this.prisma.moderationFlag.update({
      where: { id },
      data: { reviewedAt: new Date(), reviewedById: adminId, resolution: dto.resolution },
    });

    if (dto.reactivateUser && flag.userId) {
      await this.prisma.user.update({ where: { id: flag.userId }, data: { status: 'ACTIVE' } });
    }

    return updated;
  }

  // Suspensión/reactivación manual, para cuando el reporte no vino de la IA
  // (ej. otro usuario avisó por fuera de la app).
  async setUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.prisma.user.update({ where: { id: userId }, data: { status } });
  }

  private async assertOrganizationExists(id: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id } });
    if (!organization) {
      throw new NotFoundException('Organización no encontrada');
    }
    return organization;
  }
}
