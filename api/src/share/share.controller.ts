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

// Enlace de una colección completa: solo su dueño lo crea, consulta o revoca.
@Controller('collections/:id/share')
@UseGuards(JwtAuthGuard)
export class CollectionShareController {
  constructor(private readonly shareService: ShareService) {}

  @Get()
  async status(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Req() req: Request) {
    const { token } = await this.shareService.getCollectionLink(user.id, id);
    return { shared: token !== null, url: token ? `${publicBaseUrl(req)}/c/${token}` : null };
  }

  @Post()
  async share(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Req() req: Request) {
    const { token } = await this.shareService.getOrCreateForCollection(user.id, id);
    return { token, url: `${publicBaseUrl(req)}/c/${token}` };
  }

  @Delete()
  @HttpCode(204)
  async revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.shareService.revokeForCollection(user.id, id);
  }
}

// Sin scripts ni recursos externos; las fotos salen del mismo origen.
function sendHtml(res: Response, status: number, html: string) {
  res
    .status(status)
    .set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy':
        "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    })
    .send(html);
}

// Páginas públicas, sin autenticación.
@Controller('s')
export class PublicShareController {
  constructor(private readonly shareService: ShareService) {}

  @Get(':token')
  async view(@Param('token') token: string, @Req() req: Request, @Res() res: Response) {
    const { status, html } = await this.shareService.renderPublicPage(token, publicBaseUrl(req));
    sendHtml(res, status, html);
  }
}

@Controller('c')
export class PublicCollectionShareController {
  constructor(private readonly shareService: ShareService) {}

  @Get(':token')
  async grid(@Param('token') token: string, @Req() req: Request, @Res() res: Response) {
    const { status, html } = await this.shareService.renderCollectionPage(token, publicBaseUrl(req));
    sendHtml(res, status, html);
  }

  @Get(':token/:itemId')
  async item(
    @Param('token') token: string,
    @Param('itemId') itemId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { status, html } = await this.shareService.renderCollectionItemPage(token, itemId, publicBaseUrl(req));
    sendHtml(res, status, html);
  }
}
