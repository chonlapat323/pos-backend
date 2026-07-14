import { Module } from '@nestjs/common';
import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import { PlatformShopsController } from './platform-shops.controller';
import { PlatformShopsService } from './platform-shops.service';

@Module({
  imports: [PlatformAuthModule],
  controllers: [PlatformShopsController],
  providers: [PlatformShopsService],
})
export class PlatformShopsModule {}
