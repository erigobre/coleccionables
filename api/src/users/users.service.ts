import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { isUsernameProfane } from '../auth/profanity/username-filter.js';
import { EmailService } from '../email/email.service.js';
import type { UpdateMeDto } from './dto/update-me.dto.js';
import type { UpdateUsernameDto } from './dto/update-username.dto.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';

const SALT_ROUNDS = 10;
const USERNAME_COOLDOWN_DAYS = 30;
const EMAIL_VERIFICATION_HOURS = 24;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatarUrl: true,
        role: true,
        organizationId: true,
        emailVerified: true,
        usernameChangedAt: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true, plan: true, subscriptionStatus: true, sponsored: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name, avatarUrl: dto.avatarUrl },
    });

    return this.reissueTokensFor(user);
  }

  // Cooldown de 30 días (plan de Ajustes): se mide desde el último cambio, o
  // desde siempre si nunca lo cambió (usernameChangedAt null no bloquea).
  async updateUsername(userId: string, dto: UpdateUsernameDto) {
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (current.usernameChangedAt) {
      const cooldownEnds = new Date(current.usernameChangedAt);
      cooldownEnds.setDate(cooldownEnds.getDate() + USERNAME_COOLDOWN_DAYS);
      if (cooldownEnds > new Date()) {
        throw new ForbiddenException({
          message: 'Solo puedes cambiar tu @usuario cada 30 días',
          code: 'USERNAME_COOLDOWN',
          cooldownEnds,
        });
      }
    }

    const username = dto.username.toLowerCase();
    if (username === current.username) {
      throw new BadRequestException('Ese ya es tu @usuario actual');
    }
    if (isUsernameProfane(username)) {
      throw new ConflictException('Ese usuario no está permitido');
    }

    const taken = await this.prisma.user.findUnique({ where: { username } });
    if (taken) {
      throw new ConflictException('Ese usuario ya está en uso');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { username, usernameChangedAt: new Date() },
    });

    return this.reissueTokensFor(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const matches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Tu contraseña actual no es correcta');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    this.emailService.sendPasswordChangedEmail({ toEmail: user.email, userName: user.name }).catch(() => {});

    return { success: true };
  }

  async sendEmailVerification(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerified) {
      return { alreadyVerified: true };
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFICATION_HOURS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerificationToken: token, emailVerificationTokenExpiresAt: expiresAt },
    });

    await this.emailService.sendEmailVerificationEmail({ toEmail: user.email, userName: user.name, token });

    return { alreadyVerified: false };
  }

  // Público (sin JWT): el enlace del correo llega a un navegador, no a la app.
  async verifyEmailByToken(token: string) {
    const user = await this.prisma.user.findUnique({ where: { emailVerificationToken: token } });
    if (!user || !user.emailVerificationTokenExpiresAt || user.emailVerificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Este enlace de verificación no es válido o ya venció');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerificationToken: null, emailVerificationTokenExpiresAt: null },
    });

    return { verified: true };
  }

  // Decisión #2 y #8 del plan de Ajustes: no es un DELETE duro — queda 15 días
  // de gracia (AccountDeletionCronService la anonimiza si no vuelve a iniciar
  // sesión) y un login explícito la reactiva (ver AuthService.login).
  async deleteAccount(userId: string) {
    const deleteAfter = new Date();
    deleteAfter.setDate(deleteAfter.getDate() + 15);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'PENDING_DELETION', deletionRequestedAt: new Date() },
    });

    this.emailService
      .sendAccountDeletionEmail({ toEmail: user.email, userName: user.name, deleteAfter })
      .catch(() => {});

    return { deletionRequestedAt: user.deletionRequestedAt, deleteAfter };
  }

  private reissueTokensFor(user: { id: string; email: string; name: string; username: string | null; role: UserRole; organizationId: string }) {
    return this.authService.reissueTokens({
      sub: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      role: user.role,
      organizationId: user.organizationId,
    });
  }
}
