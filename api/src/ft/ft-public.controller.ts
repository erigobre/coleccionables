import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// Endpoints públicos, sin autenticación: la landing (frikidex.com) y la
// pantalla de compra de FT (antes de iniciar sesión) los usan para mostrar
// precios reales en vez de los que antes estaban hardcodeados en el HTML.
// Solo lectura de catálogos activos — nada aquí mueve saldo ni dinero.
@Controller('ft')
export class FtPublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('packages')
  async getPackages() {
    const now = new Date();
    const packages = await this.prisma.ftPackage.findMany({
      where: {
        isActive: true,
        OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
        AND: [{ OR: [{ availableUntil: null }, { availableUntil: { gte: now } }] }],
      },
      orderBy: { sortOrder: 'asc' },
      select: { code: true, ftAmount: true, priceMxnCents: true, badge: true },
    });
    return { packages };
  }

  @Get('plans')
  async getPlans() {
    const plans = await this.prisma.ftPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        code: true,
        label: true,
        ftAmountMonthly: true,
        monthlyPriceMxnCents: true,
        annualPriceMxnCents: true,
        annualEnabled: true,
        badge: true,
      },
    });
    return { plans };
  }

  // Mismo catálogo que /ft/services (autenticado), pero accesible desde la
  // landing pública antes de crear cuenta, para mostrar "Analizar (2 FT)".
  @Get('services/public')
  async getPublicServices() {
    const services = await this.prisma.ftServiceConfig.findMany({
      where: { active: true },
      orderBy: { key: 'asc' },
      select: { key: true, label: true, ftCost: true },
    });
    return { services };
  }
}
