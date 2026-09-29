import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ReferralsService } from './referrals.service.js';
import { RedeemCodeDto } from './dto/redeem-code.dto.js';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('me')
  getMyReferralInfo(@CurrentUser() user: AuthenticatedUser) {
    return this.referralsService.getMyReferralInfo(user.id);
  }

  @Post('redeem')
  redeemCode(@CurrentUser() user: AuthenticatedUser, @Body() dto: RedeemCodeDto) {
    return this.referralsService.redeemCode(user.id, dto.code);
  }
}
