import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { DEFAULT_COLLECTIONS } from '../collections/default-collections.js';
import { FtService } from '../ft/ft.service.js';
import { isUsernameProfane } from './profanity/username-filter.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './auth.types.js';

const SALT_ROUNDS = 10;
const MONTHLY_FREE_FT_FALLBACK = 20;
const FREE_FT_LOT_DAYS = 30;

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly ftService: FtService,
  ) {}

  // Chequeo en vivo desde el registro (plan: bloquear el alta hasta que el
  // usuario elegido esté libre). Si está tomado, sugiere el mismo nombre con
  // un sufijo numérico aleatorio que también verificamos libre.
  async checkUsernameAvailability(rawUsername: string) {
    const username = rawUsername.toLowerCase();
    if (isUsernameProfane(username)) {
      return { available: false, suggestion: null, blocked: true };
    }

    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (!existing) {
      return { available: true, suggestion: null, blocked: false };
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = Math.floor(Math.random() * 9000 + 1000);
      const candidate = `${username}${suffix}`.slice(0, 20);
      const taken = await this.prisma.user.findUnique({ where: { username: candidate } });
      if (!taken) {
        return { available: false, suggestion: candidate, blocked: false };
      }
    }
    return { available: false, suggestion: null, blocked: false };
  }

  async register(dto: RegisterDto) {
    const username = dto.username.toLowerCase();
    if (isUsernameProfane(username)) {
      throw new ConflictException('Ese usuario no está permitido');
    }

    const [existingEmail, existingUsername] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.prisma.user.findUnique({ where: { username } }),
    ]);
    if (existingEmail) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }
    if (existingUsername) {
      throw new ConflictException('Ese usuario ya está en uso');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      // La organización ya no la nombra el usuario a mano; se deriva de su nombre.
      const organization = await tx.organization.create({
        data: { name: `Colección de ${dto.name}` },
      });

      const createdUser = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: dto.email,
          passwordHash,
          name: dto.name,
          username,
          role: 'OWNER',
        },
      });

      await tx.location.create({
        data: {
          ownerId: createdUser.id,
          name: 'Ubicación permanente',
          isPermanentDefault: true,
        },
      });

      await tx.collection.createMany({
        data: DEFAULT_COLLECTIONS.map((name) => ({
          ownerId: createdUser.id,
          name,
          isDefault: true,
        })),
      });

      return createdUser;
    });

    // Regalo inicial de FrikiTokens (fuera de la transacción de arriba: si
    // fallara, la cuenta ya quedó creada y el cron diario de regalo mensual
    // la recoge de todos modos porque `ftFreeGrantAt` sigue en null).
    try {
      const amount = await this.ftService.getConfigValue('MONTHLY_FREE_FT', MONTHLY_FREE_FT_FALLBACK);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + FREE_FT_LOT_DAYS);
      await this.prisma.organization.update({
        where: { id: user.organizationId },
        data: { ftFreeGrantAt: new Date() },
      });
      await this.ftService.grant({
        organizationId: user.organizationId,
        userId: user.id,
        source: 'MONTHLY_FREE',
        amount,
        expiresAt,
        idempotencyKey: `signup-free:${user.organizationId}`,
      });
    } catch (error) {
      this.logger.warn(`No se pudo dar el regalo inicial de FT a ${user.organizationId}`, error as Error);
    }

    return this.issueTokens({
      sub: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      role: user.role,
      organizationId: user.organizationId,
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Tu cuenta está suspendida. Contacta a soporte si crees que es un error.');
    }

    await this.prisma.usageEvent.create({
      data: { userId: user.id, type: 'LOGIN' },
    });

    return this.issueTokens({
      sub: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      role: user.role,
      organizationId: user.organizationId,
    });
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Tu cuenta está suspendida');
    }

    return this.issueTokens({
      sub: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      role: user.role,
      organizationId: user.organizationId,
    });
  }

  private async issueTokens(payload: JwtPayload): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as NonNullable<
          JwtSignOptions['expiresIn']
        >,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as NonNullable<
          JwtSignOptions['expiresIn']
        >,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
