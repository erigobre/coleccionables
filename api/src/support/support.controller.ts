import { Body, Controller, Get, Ip, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CreateSupportRequestDto } from './dto/create-support-request.dto.js';
import { renderSupportPage } from './support.page.js';
import { SupportService } from './support.service.js';

const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

// Página pública de soporte (frikidex.com/soporte): la URL de "support" que
// piden Google Play / App Store Connect en la ficha de la app. Sin
// autenticación, igual que /waitlist y las páginas legales.
@Controller('soporte')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  page(@Res() res: Response) {
    res.status(200).set(PAGE_HEADERS).send(renderSupportPage());
  }

  @Post()
  create(@Body() dto: CreateSupportRequestDto, @Ip() ip: string) {
    return this.supportService.create(dto, ip);
  }
}
