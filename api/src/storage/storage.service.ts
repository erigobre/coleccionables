import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const UPLOADS_DIR = join(process.cwd(), 'uploads');
const MAX_WIDTH = 1280;
const JPEG_QUALITY = 70;

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
}
