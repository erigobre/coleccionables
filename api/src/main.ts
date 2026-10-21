import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // bodyParser:false + límites manuales: las fotos de objetos viajan como
  // base64 dentro del JSON (evita el bug de Android "Unsupported FormData
  // part implementation" al subir multipart bajo la New Architecture de RN),
  // y el límite default de Express (~100kb) se queda corto para varias fotos.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));
  // Sin esto, respuestas como /ft/balance u /organizations/me no llevan
  // ningún header de caché, y el caché HTTP nativo de iOS (NSURLCache) puede
  // guardarlas por URL sin distinguir el header Authorization — una cuenta
  // puede recibir en el dispositivo el balance/suscripción cacheado de OTRA
  // cuenta que usó la app ahí antes (bug real reportado 2026-10-21). No
  // aplica a /uploads: esas fotos sí se benefician de caché y su nombre de
  // archivo (uuid) ya es único por foto, no hay riesgo de mezclar cuentas.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/uploads')) res.setHeader('Cache-Control', 'no-store');
    next();
  });
  // Detrás del proxy de Coolify: sin esto, req.ip da la IP interna del proxy
  // en vez de la del visitante (necesario para el rate-limit de /waitlist).
  app.set('trust proxy', 1);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
