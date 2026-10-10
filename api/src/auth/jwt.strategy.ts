import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser, JwtPayload } from './auth.types.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET as string,
    });
  }

  // Se consulta el status en cada request (el payload del JWT no lo trae) para
  // que una suspensión por moderación bloquee al usuario de inmediato, en vez
  // de esperar hasta 15 min a que expire el access token ya emitido. El mismo
  // viaje a la base ya trae passwordChangedAt: si el token se firmó antes de
  // ese momento, viene de una sesión que debió cerrarse al cambiar la
  // contraseña (ver AuthService.resetPassword/UsersService.changePassword).
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { status: true, passwordChangedAt: true },
    });
    if (!user || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Tu cuenta está suspendida');
    }
    if (user.passwordChangedAt && payload.iat && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
      throw new UnauthorizedException('Tu contraseña cambió. Inicia sesión de nuevo.');
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      username: payload.username,
      role: payload.role,
      organizationId: payload.organizationId,
    };
  }
}
