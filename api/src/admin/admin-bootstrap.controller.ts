import { Body, Controller, ForbiddenException, HttpCode, HttpStatus, NotFoundException, Post } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { BootstrapSuperadminDto } from './dto/bootstrap-superadmin.dto.js';

// Único punto de entrada para crear el primer SUPERADMIN (no hay ninguno al
// desplegar, y el registro normal siempre da de alta OWNER). Sin JWT a
// propósito -- el gate es SUPERADMIN_BOOTSTRAP_SECRET (env var, no committeado).
// Si la variable no está configurada, el endpoint queda inutilizable (404),
// así que solo funciona cuando alguien la puso a propósito en Coolify.
@Controller('admin/bootstrap-superadmin')
export class AdminBootstrapController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async bootstrap(@Body() dto: BootstrapSuperadminDto) {
    const expected = process.env.SUPERADMIN_BOOTSTRAP_SECRET;
    if (!expected) {
      throw new NotFoundException();
    }
    if (!this.secretMatches(dto.secret, expected)) {
      throw new ForbiddenException('Secreto inválido');
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new NotFoundException('No existe un usuario registrado con ese email');
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPERADMIN' },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  // Comparación en tiempo constante para no filtrar el secreto por timing.
  private secretMatches(provided: string, expected: string): boolean {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
