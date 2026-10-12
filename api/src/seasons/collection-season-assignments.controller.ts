import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CollectionSeasonAssignmentsService } from './collection-season-assignments.service.js';
import { CreateCollectionSeasonAssignmentDto } from './dto/create-collection-season-assignment.dto.js';
import { ApplySeasonChecklistDto } from './dto/apply-season-checklist.dto.js';

@Controller('collections/:collectionId/season-assignments')
@UseGuards(JwtAuthGuard)
export class CollectionSeasonAssignmentsController {
  constructor(private readonly service: CollectionSeasonAssignmentsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('collectionId') collectionId: string) {
    return this.service.list(user.id, collectionId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('collectionId') collectionId: string,
    @Body() dto: CreateCollectionSeasonAssignmentDto,
  ) {
    return this.service.create(user.id, collectionId, dto);
  }

  @Delete(':assignmentId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('collectionId') collectionId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.service.remove(user.id, collectionId, assignmentId);
  }

  @Get(':assignmentId/checklist')
  getChecklist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('collectionId') collectionId: string,
    @Param('assignmentId') assignmentId: string,
    @Query('direction') direction: 'start' | 'end',
  ) {
    return this.service.getChecklist(user.id, collectionId, assignmentId, direction === 'end' ? 'end' : 'start');
  }

  @Post(':assignmentId/checklist/apply')
  applyChecklist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('collectionId') collectionId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: ApplySeasonChecklistDto,
  ) {
    return this.service.applyChecklist(user.id, collectionId, assignmentId, dto);
  }
}
