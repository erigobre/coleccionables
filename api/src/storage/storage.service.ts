import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const UPLOADS_DIR = join(process.cwd(), 'uploads');
const MAX_WIDTH = 1280;
const JPEG_QUALITY = 70;
// Solo se borran archivos con la forma exacta que genera saveCompressedImage: la URL
// viene de la base de datos y podría haberse guardado con cualquier texto.
const STORED_IMAGE_URL = /^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;

@Injectable()
export class StorageService {
  // Guarda la imagen comprimida en baja resolución (plan §5.3.13) y devuelve su URL pública.
  async saveCompressedImage(file: { buffer: Buffer; mimetype: string }): Promise<string> {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('El archivo debe ser una imagen');
    }

    await mkdir(UPLOADS_DIR, { recursive: true });

    const filename = `${randomUUID()}.jpg`;
    const compressed = await sharp(file.buffer)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    await writeFile(join(UPLOADS_DIR, filename), compressed);

    return `/uploads/${filename}`;
  }

  async deleteImage(url: string): Promise<void> {
    if (!STORED_IMAGE_URL.test(url)) return;
    await unlink(join(UPLOADS_DIR, url.slice('/uploads/'.length))).catch(() => undefined);
  }
}
