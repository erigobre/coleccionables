import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { FtService } from './ft.service.js';

@Controller('ft')
@UseGuards(JwtAuthGuard)
export class FtController {
  constructor(private readonly ftService: FtService) {}

  // Contador persistente de saldo (plan §6 reglas de UI obligatorias).
  @Get('balance')
  getBalance(@CurrentUser() user: AuthenticatedUser) {
    return this.ftService.getBalance(user.organizationId);
  }

  // Catálogo de costos por acción, para mostrar "Analizar (2 FT)" en vivo.
  @Get('services')
  getServices() {
    return this.ftService.getCatalog();
  }

  @Get('transactions')
  getTransactions(@CurrentUser() user: AuthenticatedUser, @Query('take') take?: string) {
    const parsed = take ? Number.parseInt(take, 10) : undefined;
    return this.ftService.getTransactions(user.organizationId, parsed && parsed > 0 ? parsed : undefined);
  }
}
