import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentPlatformAdmin } from './current-platform-admin.decorator';
import { PlatformLoginDto } from './dto/login.dto';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformJwtAuthGuard } from './platform-jwt-auth.guard';
import type { CurrentPlatformAdminPayload } from './types';

@Controller('platform/auth')
export class PlatformAuthController {
  constructor(private readonly platformAuthService: PlatformAuthService) {}

  @Post('login')
  login(@Body() dto: PlatformLoginDto) {
    return this.platformAuthService.login(dto);
  }

  @Get('me')
  @UseGuards(PlatformJwtAuthGuard)
  me(@CurrentPlatformAdmin() admin: CurrentPlatformAdminPayload) {
    return admin;
  }
}
