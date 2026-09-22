import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { renderPrivacyPolicyPage } from './privacy-policy.page.js';

// Página pública, sin autenticación: la piden Google Play / App Store Connect
// como URL de política de privacidad de la ficha de la app.
@Controller()
export class LegalController {
  @Get('privacidad')
  privacyPolicy(@Res() res: Response) {
    res
      .status(200)
      .set({
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy':
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      })
      .send(renderPrivacyPolicyPage());
  }
}
