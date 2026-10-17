import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { BoundingBox, ImageInput } from '../ai/ai.types.js';

const UPLOADS_DIR = join(process.cwd(), 'uploads');
const MAX_WIDTH = 1280;
const JPEG_QUALITY = 70;
const AVATAR_SIZE = 512;
const AVATAR_QUALITY = 80;
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

  // Avatar 1:1 del objeto (plan de re-ranking visual "¿Ya lo tengo?"): si viene
  // `box` (detectado por Gemini en analyzePhotos, gratis), recorta justo ese
  // recuadro expandido a cuadrado; si no, recorta el cuadrado centrado más
  // grande de la foto (fallback determinista, sin IA, para altas manuales/por
  // código de barras). El recorte en sí siempre es puramente geométrico (sharp).
  async saveAvatar(file: { buffer: Buffer; mimetype: string }, box?: BoundingBox): Promise<string> {
    await mkdir(UPLOADS_DIR, { recursive: true });

    const filename = `${randomUUID()}.jpg`;
    const cropped = await this.cropToAvatar(file, box);
    await writeFile(join(UPLOADS_DIR, filename), cropped.buffer);

    return `/uploads/${filename}`;
  }

  // Igual que saveAvatar pero sin escribir a disco: para "¿Ya lo tengo?", que
  // por diseño no persiste ninguna foto de la consulta, solo necesita el
  // recorte en memoria para comparar contra los avatares ya guardados.
  async cropToAvatar(file: { buffer: Buffer; mimetype: string }, box?: BoundingBox): Promise<ImageInput> {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('El archivo debe ser una imagen');
    }
    const buffer = await this.squareCropBuffer(file.buffer, box);
    return { buffer, mimetype: 'image/jpeg' };
  }

  // Recorta un cuadrado de la imagen ya orientada (EXIF resuelto): centrado en
  // `box` si se da (expandido al lado más largo del recuadro, sin salirse de
  // los límites de la foto), o el cuadrado centrado más grande si no.
  private async squareCropBuffer(buffer: Buffer, box?: BoundingBox): Promise<Buffer> {
    const rotated = await sharp(buffer).rotate().toBuffer();
    const meta = await sharp(rotated).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;

    if (!width || !height) {
      return sharp(rotated)
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
        .jpeg({ quality: AVATAR_QUALITY })
        .toBuffer();
    }

    let left: number;
    let top: number;
    let size: number;

    if (box) {
      const boxLeft = box.xMin * width;
      const boxTop = box.yMin * height;
      const boxWidth = (box.xMax - box.xMin) * width;
      const boxHeight = (box.yMax - box.yMin) * height;
      const centerX = boxLeft + boxWidth / 2;
      const centerY = boxTop + boxHeight / 2;
      size = Math.round(Math.min(Math.max(boxWidth, boxHeight), Math.min(width, height)));
      left = Math.round(Math.min(Math.max(centerX - size / 2, 0), width - size));
      top = Math.round(Math.min(Math.max(centerY - size / 2, 0), height - size));
    } else {
      size = Math.min(width, height);
      left = Math.round((width - size) / 2);
      top = Math.round((height - size) / 2);
    }

    return sharp(rotated)
      .extract({ left, top, width: size, height: size })
      .resize(AVATAR_SIZE, AVATAR_SIZE)
      .jpeg({ quality: AVATAR_QUALITY })
      .toBuffer();
  }

  // Relee una imagen ya guardada en /uploads como buffer para usarla como
  // candidato en la comparación visual de Gemini (GeminiService.compareCandidates).
  async readImage(url: string): Promise<ImageInput | null> {
    if (!STORED_IMAGE_URL.test(url)) return null;
    try {
      const buffer = await readFile(join(UPLOADS_DIR, url.slice('/uploads/'.length)));
      return { buffer, mimetype: 'image/jpeg' };
    } catch {
      return null;
    }
  }
}
