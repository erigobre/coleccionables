import { Controller, Delete, Get, HttpCode, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ShareService } from './share.service.js';

// Detrás del proxy de Coolify el protocolo real llega en x-forwarded-proto.
// PUBLIC_BASE_URL manda cuando exista el dominio definitivo (frikidex.app).
function publicBaseUrl(req: Request): string {
  const configured = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, '');
  if (configured) return configured;
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ?? req.protocol;
  return `${proto}://${req.get('host')}`;
}

// Gestión del enlace: solo el dueño del objeto.
@Controller('items/:id/share')
@UseGuards(JwtAuthGuard)
export class ItemShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post()
  async share(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Req() req: Request) {
    const { token } = await this.shareService.getOrCreate(user.id, id);
    return { token, url: `${publicBaseUrl(req)}/s/${token}` };
  }

  @Delete()
  @HttpCode(204)
  async revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.shareService.revoke(user.id, id);
  }
}

// Página pública, sin autenticación.
@Controller('s')
export class PublicShareController {
  constructor(private readonly shareService: ShareService) {}

  @Get(':token')
  async view(@Param('token') token: string, @Req() req: Request, @Res() res: Response) {
    const { status, html } = await this.shareService.renderPublicPage(token, publicBaseUrl(req));
    res
      .status(status)
      .set({
        'Content-Type': 'text/html; charset=utf-8',
        // Sin scripts ni recursos externos; las fotos salen del mismo origen.
        'Content-Security-Policy':
          "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store',
      })
      .send(html);
  }
}
