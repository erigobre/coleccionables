import { Module } from '@nestjs/common';
import { FtModule } from '../ft/ft.module.js';
import { CollectionsModule } from '../collections/collections.module.js';
import { LocationsModule } from '../locations/locations.module.js';
import { OnboardingService } from './onboarding.service.js';
import { OnboardingController } from './onboarding.controller.js';

@Module({
  imports: [FtModule, CollectionsModule, LocationsModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
