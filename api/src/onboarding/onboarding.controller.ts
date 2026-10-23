import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { OnboardingService } from './onboarding.service.js';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto.js';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('options')
  getOptions() {
    return this.onboardingService.getOptions();
  }

  @Get('status')
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.onboardingService.getStatus(user.id);
  }

  @Post('complete')
  complete(@CurrentUser() user: AuthenticatedUser, @Body() dto: CompleteOnboardingDto) {
    return this.onboardingService.complete(user.id, dto);
  }
}
