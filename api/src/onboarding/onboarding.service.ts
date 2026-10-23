import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FtService } from '../ft/ft.service.js';
import { CollectionsService } from '../collections/collections.service.js';
import { LocationsService } from '../locations/locations.service.js';
import type { CompleteOnboardingDto } from './dto/complete-onboarding.dto.js';

const SIGNUP_FREE_FT_FALLBACK = 20;

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ftService: FtService,
    private readonly collectionsService: CollectionsService,
    private readonly locationsService: LocationsService,
  ) {}

  async getOptions() {
    const options = await this.prisma.onboardingOption.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return {
      collecting: options.filter((o) => o.kind === 'COLLECTING'),
      locations: options.filter((o) => o.kind === 'LOCATION'),
    };
  }

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const welcomeGiftAmount = await this.ftService.getConfigValue(
      'SIGNUP_FREE_FT',
      SIGNUP_FREE_FT_FALLBACK,
    );
    return { completed: !!user.onboardingCompletedAt, welcomeGiftAmount };
  }

  // Los arrays vacíos son válidos (usuario que omitió esa pregunta): simplemente
  // no se crea nada para ese lado. La regla de "mínimo 1" es solo de UI.
  async complete(userId: string, dto: CompleteOnboardingDto) {
    const [collectingOptions, locationOptions] = await Promise.all([
      dto.collectingCodes.length
        ? this.prisma.onboardingOption.findMany({
            where: { kind: 'COLLECTING', isActive: true, code: { in: dto.collectingCodes } },
          })
        : [],
      dto.locationCodes.length
        ? this.prisma.onboardingOption.findMany({
            where: { kind: 'LOCATION', isActive: true, code: { in: dto.locationCodes } },
          })
        : [],
    ]);

    for (const option of collectingOptions) {
      await this.collectionsService.create(userId, { name: option.label, icon: option.icon });
    }
    for (const option of locationOptions) {
      await this.locationsService.create(userId, { name: option.label, icon: option.icon });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: new Date(), themePreference: dto.theme },
    });
  }
}
