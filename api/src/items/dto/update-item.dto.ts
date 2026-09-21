import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateItemDto } from './create-item.dto.js';

// Ubicación, colecciones, tags y fotos se gestionan con sus propios endpoints
// dedicados (semántica de agregar/quitar, no de reemplazo parcial ambiguo).
export class UpdateItemDto extends PartialType(
  OmitType(CreateItemDto, ['locationId', 'collectionIds', 'tagIds', 'photoUrls'] as const),
) {}
