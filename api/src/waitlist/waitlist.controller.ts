import { Body, Controller, Ip, Post } from '@nestjs/common';
import { JoinWaitlistDto } from './dto/join-waitlist.dto.js';
import { WaitlistService } from './waitlist.service.js';

// Público, sin autenticación: lo llama la landing (frikidex.com) antes de
// que exista una cuenta.
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  join(@Body() dto: JoinWaitlistDto, @Ip() ip: string) {
    return this.waitlistService.join(dto, ip);
  }
}
