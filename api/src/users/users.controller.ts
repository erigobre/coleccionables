import { Body, Controller, Delete, Get, Headers, HttpCode, Ip, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { UsersService } from './users.service.js';
import { UpdateMeDto } from './dto/update-me.dto.js';
import { UpdateUsernameDto } from './dto/update-username.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findMe(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Patch('me/username')
  @UseGuards(JwtAuthGuard)
  updateUsername(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUsernameDto) {
    return this.usersService.updateUsername(user.id, dto);
  }

  @Post('me/change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.usersService.changePassword(user.id, dto, ip, userAgent);
  }

  @Post('me/email/send-verification')
  @UseGuards(JwtAuthGuard)
  sendEmailVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.sendEmailVerification(user.id);
  }

  // Público: el enlace del correo de verificación abre en el navegador, sin JWT.
  @Get('email/verify')
  verifyEmail(@Query('token') token: string) {
    return this.usersService.verifyEmailByToken(token);
  }

  @Delete('me')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  deleteAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.deleteAccount(user.id);
  }
}
