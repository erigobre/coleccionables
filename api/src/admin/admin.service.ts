import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { FtService } from '../ft/ft.service.js';
import type { CreatePaymentDto } from './dto/create-payment.dto.js';
import type { ResolveModerationFlagDto } from './dto/resolve-moderation-flag.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import type { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import type { CreateFtPackageDto, UpdateFtPackageDto } from './dto/upsert-ft-package.dto.js';
import type { CreateFtPlanDto, UpdateFtPlanDto } from './dto/upsert-ft-plan.dto.js';
import type { GrantFtDto } from './dto/grant-ft.dto.js';

const ACTIVE_WINDOW_DAYS = 30;
const TIMESERIES_MAX_MONTHS = 12;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ftService: FtService,
  ) {}

  // Bitácora de acciones del panel Superadmin (plan §5.6, pedido 2026-09-25).
  // Nunca debe tumbar la acción que audita si falla (ej. tabla recién migrada
  // en un ambiente que no corrió la migración todavía) — se traga el error.
  private async logAction(
    admin: { id: string; email: string },
    action: string,
    targetType: string,
    targetId: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          action,
          targetType,
          targetId,
          metadata: metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch {
      // No-op deliberado: el log es de mejor esfuerzo, nunca bloqueante.
    }
  }

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

  async updateOrganization(
    admin: { id: string; email: string },
    organizationId: string,
    dto: UpdateOrganizationDto,
  ) {
    await this.assertOrganizationExists(organizationId);
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: dto.name,
        plan: dto.plan,
        subscriptionStatus: dto.subscriptionStatus,
      },
    });
    await this.logAction(admin, 'organization.update', 'Organization', organizationId, { ...dto });
    return updated;
  }

  // Todos los pagos de todas las organizaciones, más recientes primero (plan
  // §5.6: vista global, no solo anidada dentro de cada organización).
  findPayments() {
    return this.prisma.payment.findMany({
      include: { organization: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  // Activa/desactiva cuenta patrocinada: nunca paga (plan §2).
  async setSponsored(admin: { id: string; email: string }, organizationId: string, sponsored: boolean) {
    await this.assertOrganizationExists(organizationId);
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        sponsored,
        subscriptionStatus: sponsored ? 'SPONSORED' : 'ACTIVE',
      },
    });
    await this.logAction(admin, sponsored ? 'organization.sponsor' : 'organization.unsponsor', 'Organization', organizationId);
    return updated;
  }

  async addPayment(admin: { id: string; email: string }, organizationId: string, dto: CreatePaymentDto) {
    await this.assertOrganizationExists(organizationId);
    const payment = await this.prisma.payment.create({
      data: {
        organizationId,
        amount: dto.amount,
        currency: dto.currency ?? 'MXN',
        status: dto.status ?? 'PENDING',
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
      },
    });
    await this.logAction(admin, 'payment.create', 'Organization', organizationId, { amount: dto.amount, status: payment.status });
    return payment;
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

  // Serie mensual para las gráficas del dashboard (plan §5.6, pedido
  // 2026-09-25): altas de usuarios y escaneos de IA por mes. Se bucketiza en
  // JS en vez de con SQL agrupado por mes (MySQL no tiene DATE_TRUNC nativo y
  // el volumen actual no lo justifica) — trae solo `createdAt`/`type` de la
  // ventana pedida y agrupa en memoria.
  async getStatsTimeseries(months?: number) {
    const monthCount = Math.min(Math.max(months ?? 6, 1), TIMESERIES_MAX_MONTHS);
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setMonth(from.getMonth() - (monthCount - 1), 1);

    const buckets: { key: string; label: string }[] = [];
    for (let i = 0; i < monthCount; i++) {
      const d = new Date(from);
      d.setMonth(d.getMonth() + i);
      buckets.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toISOString() });
    }
    const bucketKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const [users, aiScans] = await Promise.all([
      this.prisma.user.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }),
      this.prisma.usageEvent.findMany({
        where: { type: 'AI_SCAN', createdAt: { gte: from } },
        select: { createdAt: true },
      }),
    ]);

    const newUsersByMonth = new Map(buckets.map((b) => [b.key, 0]));
    for (const u of users) {
      const key = bucketKey(u.createdAt);
      if (newUsersByMonth.has(key)) newUsersByMonth.set(key, newUsersByMonth.get(key)! + 1);
    }
    const aiScansByMonth = new Map(buckets.map((b) => [b.key, 0]));
    for (const e of aiScans) {
      const key = bucketKey(e.createdAt);
      if (aiScansByMonth.has(key)) aiScansByMonth.set(key, aiScansByMonth.get(key)! + 1);
    }

    return buckets.map((b) => ({
      month: b.key,
      newUsers: newUsersByMonth.get(b.key) ?? 0,
      aiScans: aiScansByMonth.get(b.key) ?? 0,
    }));
  }

  // Bitácora del panel: más reciente primero.
  findAuditLogs() {
    return this.prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  // Detalle de un usuario para soporte/moderación (plan §5.6, pedido
  // 2026-09-25): perfil + organización + conteos + últimos objetos/eventos.
  // No reutiliza los endpoints normales de items/collections porque esos
  // están escopados a req.user (dueño), no a un userId arbitrario.
  async findUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true, plan: true, subscriptionStatus: true, sponsored: true },
        },
        _count: { select: { items: true, collections: true, seasons: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const [recentItems, recentUsageEvents] = await Promise.all([
      this.prisma.item.findMany({
        where: { ownerId: id },
        select: { id: true, name: true, status: true, category: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.usageEvent.findMany({
        where: { userId: id },
        select: { id: true, type: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return { ...user, recentItems, recentUsageEvents };
  }

  async updateUser(admin: { id: string; email: string }, userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name, email: dto.email },
    });
    await this.logAction(admin, 'user.update', 'User', userId, { ...dto });
    return updated;
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

  async resolveModerationFlag(admin: { id: string; email: string }, id: string, dto: ResolveModerationFlagDto) {
    const flag = await this.prisma.moderationFlag.findUnique({ where: { id } });
    if (!flag) {
      throw new NotFoundException('Incidente de moderación no encontrado');
    }

    const updated = await this.prisma.moderationFlag.update({
      where: { id },
      data: { reviewedAt: new Date(), reviewedById: admin.id, resolution: dto.resolution },
    });

    if (dto.reactivateUser && flag.userId) {
      await this.prisma.user.update({ where: { id: flag.userId }, data: { status: 'ACTIVE' } });
    }

    await this.logAction(admin, 'moderationFlag.resolve', 'ModerationFlag', id, {
      reactivateUser: dto.reactivateUser ?? false,
    });
    return updated;
  }

  // Suspensión/reactivación manual, para cuando el reporte no vino de la IA
  // (ej. otro usuario avisó por fuera de la app).
  async setUserStatus(admin: { id: string; email: string }, userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { status } });
    await this.logAction(admin, status === 'SUSPENDED' ? 'user.suspend' : 'user.reactivate', 'User', userId);
    return updated;
  }

  // Catálogo de paquetes de compra de FT (FtPackage): mismo modelo que
  // alimenta GET /ft/packages (landing + modal "sin FrikiTokens" de la app).
  // Se listan todos (activos e inactivos) porque el panel también necesita
  // poder reactivar uno viejo, a diferencia del endpoint público.
  findFtPackages() {
    return this.prisma.ftPackage.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createFtPackage(admin: { id: string; email: string }, dto: CreateFtPackageDto) {
    const created = await this.prisma.ftPackage.create({
      data: {
        code: dto.code,
        ftAmount: dto.ftAmount,
        priceMxnCents: dto.priceMxnCents,
        badge: dto.badge,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : undefined,
        availableUntil: dto.availableUntil ? new Date(dto.availableUntil) : undefined,
      },
    });
    await this.logAction(admin, 'ftPackage.create', 'FtPackage', created.id, { ...dto });
    return created;
  }

  async updateFtPackage(admin: { id: string; email: string }, id: string, dto: UpdateFtPackageDto) {
    await this.assertFtPackageExists(id);
    const updated = await this.prisma.ftPackage.update({
      where: { id },
      data: {
        ftAmount: dto.ftAmount,
        priceMxnCents: dto.priceMxnCents,
        badge: dto.badge,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
        availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : undefined,
        availableUntil: dto.availableUntil ? new Date(dto.availableUntil) : undefined,
      },
    });
    await this.logAction(admin, 'ftPackage.update', 'FtPackage', id, { ...dto });
    return updated;
  }

  // Planes de suscripción mensual de FT (FtPlan) — mismo modelo que alimenta
  // GET /ft/plans.
  findFtPlans() {
    return this.prisma.ftPlan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createFtPlan(admin: { id: string; email: string }, dto: CreateFtPlanDto) {
    const created = await this.prisma.ftPlan.create({
      data: {
        code: dto.code,
        label: dto.label,
        ftAmountMonthly: dto.ftAmountMonthly,
        monthlyPriceMxnCents: dto.monthlyPriceMxnCents,
        annualPriceMxnCents: dto.annualPriceMxnCents,
        annualEnabled: dto.annualEnabled ?? false,
        badge: dto.badge,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.logAction(admin, 'ftPlan.create', 'FtPlan', created.id, { ...dto });
    return created;
  }

  async updateFtPlan(admin: { id: string; email: string }, id: string, dto: UpdateFtPlanDto) {
    await this.assertFtPlanExists(id);
    const updated = await this.prisma.ftPlan.update({
      where: { id },
      data: {
        label: dto.label,
        ftAmountMonthly: dto.ftAmountMonthly,
        monthlyPriceMxnCents: dto.monthlyPriceMxnCents,
        annualPriceMxnCents: dto.annualPriceMxnCents,
        annualEnabled: dto.annualEnabled,
        badge: dto.badge,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });
    await this.logAction(admin, 'ftPlan.update', 'FtPlan', id, { ...dto });
    return updated;
  }

  // Regalo manual de FT a una organización, sin pago real (plan pedido
  // 2026-09-25): usa el mismo FtService.grant() que ya usa el regalo mensual
  // automático, con fuente PROMO (ya prevista en el modelo para esto). Queda
  // trazado en la bitácora de admin como una asignación tipo sponsor.
  async grantFt(admin: { id: string; email: string }, organizationId: string, dto: GrantFtDto) {
    await this.assertOrganizationExists(organizationId);
    const transaction = await this.ftService.grant({
      organizationId,
      source: 'PROMO',
      amount: dto.amount,
      idempotencyKey: `admin-grant:${organizationId}:${randomUUID()}`,
    });
    await this.logAction(admin, 'ft.sponsorGrant', 'Organization', organizationId, {
      amount: dto.amount,
      reason: dto.reason,
    });
    return transaction;
  }

  // Borrado en cascada para limpiar cuentas demo/prueba (pedido 2026-09-26).
  // El propio esquema (onDelete: Cascade en User/Item/Collection/etc., colgados
  // de Organization/User) hace que un solo `delete` arrastre todo lo que le
  // pertenece a nivel de base de datos — no hace falta borrar tabla por tabla.
  async deleteOrganization(admin: { id: string; email: string }, organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { users: { select: { id: true, role: true } } },
    });
    if (!organization) {
      throw new NotFoundException('Organización no encontrada');
    }
    if (organization.users.some((u) => u.role === 'SUPERADMIN')) {
      throw new BadRequestException('No se puede eliminar una organización con una cuenta SUPERADMIN');
    }

    await this.prisma.organization.delete({ where: { id: organizationId } });
    await this.logAction(admin, 'organization.delete', 'Organization', organizationId, {
      name: organization.name,
      userCount: organization.users.length,
    });
  }

  async deleteUser(admin: { id: string; email: string }, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.role === 'SUPERADMIN') {
      throw new BadRequestException('No se puede eliminar una cuenta SUPERADMIN desde aquí');
    }

    await this.prisma.user.delete({ where: { id: userId } });
    await this.logAction(admin, 'user.delete', 'User', userId, { email: user.email, name: user.name });
  }

  private async assertFtPackageExists(id: string) {
    const found = await this.prisma.ftPackage.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException('Paquete de FT no encontrado');
    }
    return found;
  }

  private async assertFtPlanExists(id: string) {
    const found = await this.prisma.ftPlan.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException('Plan de FT no encontrado');
    }
    return found;
  }

  private async assertOrganizationExists(id: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id } });
    if (!organization) {
      throw new NotFoundException('Organización no encontrada');
    }
    return organization;
  }
}
