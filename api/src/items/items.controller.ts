import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ItemsService } from './items.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { ChangeLocationDto } from './dto/change-location.dto.js';
import { MatchItemDto } from './dto/match-item.dto.js';
import { LookupBarcodeDto } from './dto/lookup-barcode.dto.js';

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateItemDto) {
    return this.itemsService.create(user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('collectionId') collectionId?: string,
    @Query('favoritesOnly') favoritesOnly?: string,
  ) {
    return this.itemsService.findAll(user.id, { collectionId, favoritesOnly: favoritesOnly === 'true' });
  }

  // Flujo "¿Ya lo tengo?" desde Home (plan §5.1, §7.2).
  @Post('match')
  match(@CurrentUser() user: AuthenticatedUser, @Body() dto: MatchItemDto) {
    return this.itemsService.match(user.id, dto);
  }

  // Analiza fotos con IA y las sube ya comprimidas (plan §5.3.6-9).
  @Post('analyze')
  @UseInterceptors(FilesInterceptor('photos'))
  analyze(@UploadedFiles() photos: Express.Multer.File[]) {
    return this.itemsService.analyzePhotos(photos);
  }

  // "¿Ya lo tengo?": identifica el objeto de la foto y lo busca en la colección.
  @Post('identify')
  @UseInterceptors(FilesInterceptor('photos'))
  identify(@CurrentUser() user: AuthenticatedUser, @UploadedFiles() photos: Express.Multer.File[]) {
    return this.itemsService.identify(user.id, photos);
  }

  // Busca el producto por código de barras (EAN/UPC) leído con la cámara.
  @Post('lookup-barcode')
  lookupBarcode(@Body() dto: LookupBarcodeDto) {
    return this.itemsService.lookupBarcode(dto.barcode);
  }

  // Antes de ':id' para que "sold" no se interprete como un id.
  @Get('sold')
  findSold(@CurrentUser() user: AuthenticatedUser, @Query('search') search?: string) {
    return this.itemsService.findSold(user.id, search);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.itemsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.itemsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.itemsService.remove(user.id, id);
  }

  @Patch(':id/favorite')
  toggleFavorite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.itemsService.toggleFavorite(user.id, id);
  }

  @Get(':id/similar')
  findSimilar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.itemsService.findSimilar(user.id, id);
  }

  @Post(':id/market-price')
  lookupMarketPrice(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.itemsService.lookupMarketPrice(user.id, id);
  }

  @Patch(':id/location')
  changeLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ChangeLocationDto,
  ) {
    return this.itemsService.changeLocation(user.id, id, dto);
  }

  @Patch(':id/return-to-permanent-location')
  returnToPermanentLocation(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.itemsService.returnToPermanentLocation(user.id, id);
  }

  // Las fotos ya se suben y comprimen vía /storage/upload o /items/analyze;
  // aquí solo se enlazan sus URLs resultantes al objeto.
  @Post(':id/photos')
  async addPhotos(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('urls') urls: string[] = [],
  ) {
    // En serie a propósito: addPhoto calcula `order` leyendo el máximo actual, y en
    // paralelo todas las fotos leerían el mismo valor y quedarían con order repetido.
    const created = [];
    for (const url of urls) {
      created.push(await this.itemsService.addPhoto(user.id, id, url));
    }
    return created;
  }

  @Delete(':id/photos/:photoId')
  removePhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.itemsService.removePhoto(user.id, id, photoId);
  }

  @Post(':id/collections/:collectionId')
  addToCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('collectionId') collectionId: string,
  ) {
    return this.itemsService.addToCollection(user.id, id, collectionId);
  }

  @Delete(':id/collections/:collectionId')
  removeFromCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('collectionId') collectionId: string,
  ) {
    return this.itemsService.removeFromCollection(user.id, id, collectionId);
  }

  @Post(':id/tags/:tagId')
  addTag(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.itemsService.addTag(user.id, id, tagId);
  }

  @Delete(':id/tags/:tagId')
  removeTag(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.itemsService.removeTag(user.id, id, tagId);
  }
}
