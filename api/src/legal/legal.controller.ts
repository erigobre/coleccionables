import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { renderPrivacyPolicyPage } from './privacy-policy.page.js';
import { renderTermsOfUsePage } from './terms-of-use.page.js';

const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

// Páginas públicas, sin autenticación: la landing (frikidex.com) enlaza
// aquí desde su footer, y Google Play / App Store Connect piden la URL de
// política de privacidad en la ficha de la app.
//
// `/privacidad` y `/terminos` son las URLs "canónicas" (ya registradas o por
// registrar en las tiendas); `/aviso-de-privacidad` y `/condiciones-de-uso`
// son alias con el nombre que usa la landing, para no depender de que todo el
// mundo use el mismo texto de enlace.
@Controller()
export class LegalController {
  @Get('privacidad')
  privacyPolicy(@Res() res: Response) {
    res.status(200).set(PAGE_HEADERS).send(renderPrivacyPolicyPage());
  }

  @Get('aviso-de-privacidad')
  privacyPolicyAlias(@Res() res: Response) {
    res.status(200).set(PAGE_HEADERS).send(renderPrivacyPolicyPage());
  }

  @Get('terminos')
  termsOfUse(@Res() res: Response) {
    res.status(200).set(PAGE_HEADERS).send(renderTermsOfUsePage());
  }

  @Get('condiciones-de-uso')
  termsOfUseAlias(@Res() res: Response) {
    res.status(200).set(PAGE_HEADERS).send(renderTermsOfUsePage());
  }
}
