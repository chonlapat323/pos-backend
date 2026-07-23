import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OmiseModule } from '../omise/omise.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [AuthModule, OmiseModule, PlatformSettingsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
