import type { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  username: string | null;
  role: UserRole;
  organizationId: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  username: string | null;
  role: UserRole;
  organizationId: string;
  // No se firma a mano; lo agrega jsonwebtoken al emitir el token. Se usa para
  // invalidar tokens emitidos antes de un cambio de contraseña (ver
  // AuthService.refresh y JwtStrategy.validate).
  iat?: number;
}
