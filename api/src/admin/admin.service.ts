import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePaymentDto } from './dto/create-payment.dto.js';

const ACTIVE_WINDOW_DAYS = 30;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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

  private async assertOrganizationExists(id: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id } });
    if (!organization) {
      throw new NotFoundException('Organización no encontrada');
    }
    return organization;
  }
}
