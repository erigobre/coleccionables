import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import type { CreateSupportRequestDto } from './dto/create-support-request.dto.js';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const RATE_LIMIT_MAX_PER_IP = 5;

@Injectable()
export class SupportService {
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

  async create(dto: CreateSupportRequestDto, ip: string | undefined) {
    // Honeypot disparado: se responde éxito para no delatar el filtro al bot,
    // pero no se guarda nada.
    if (dto.website) {
      return { ok: true };
    }

    if (ip && this.isRateLimited(ip)) {
      throw new ConflictException('Demasiados intentos, intenta de nuevo más tarde');
    }

    const name = dto.name.trim();
    const email = dto.email.trim().toLowerCase();

    await this.prisma.supportRequest.create({
      data: { name, email, category: dto.category, message: dto.message.trim(), ip },
    });

    await this.emailService.sendSupportRequestReceivedEmail({ toEmail: email, name });

    return { ok: true };
  }
}
