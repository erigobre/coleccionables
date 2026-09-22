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
}
