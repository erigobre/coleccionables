import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PhotoInputDto } from '../common/dto/photo-input.dto.js';
import { StorageService } from './storage.service.js';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  async upload(@Body() dto: PhotoInputDto) {
    const url = await this.storageService.saveCompressedImage({
      buffer: Buffer.from(dto.imageBase64, 'base64'),
      mimetype: dto.mimeType ?? 'image/jpeg',
    });
    return { url };
  }
}
