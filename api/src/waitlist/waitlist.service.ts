import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import type { JoinWaitlistDto } from './dto/join-waitlist.dto.js';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const RATE_LIMIT_MAX_PER_IP = 5;

@Injectable()
export class WaitlistService {
  // En memoria: alcanza porque hoy el API corre en una sola instancia en
  // Coolify. Si algún día se replica, mover esto a Redis o a una tabla.
  private readonly attemptsByIp = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private isRateLimited(ip: string): boolean {
    const now = Date.now();
    const attempts = (this.attemptsByIp.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    attempts.push(now);
    this.attemptsByIp.set(ip, attempts);
    return attempts.length > RATE_LIMIT_MAX_PER_IP;
  }

  async join(dto: JoinWaitlistDto, ip: string | undefined) {
    // Honeypot disparado: se responde éxito para no delatar el filtro al bot,
    // pero no se guarda nada.
    if (dto.website) {
      return { ok: true };
    }

    if (ip && this.isRateLimited(ip)) {
      throw new ConflictException('Demasiados intentos, intenta de nuevo más tarde');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.waitlist.findUnique({ where: { email } });
    await this.prisma.waitlist.upsert({
      where: { email },
      create: { email, interest: dto.interest, source: dto.source ?? 'landing', ip },
      update: { interest: dto.interest, source: dto.source ?? 'landing', ip },
    });

    // Solo se confirma la primera vez: si ya estaba en la lista y vuelve a
    // mandar el formulario (p. ej. para actualizar su interés), no hace falta
    // mandarle el mismo correo de nuevo.
    if (!existing) {
      await this.emailService.sendWaitlistConfirmationEmail({ toEmail: email });
    }

    return { ok: true };
  }
}
