import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { RequirePlatformPermission } from '../../common/decorators/require-permission.decorator';
import { PlatformPermissionsGuard } from '../../common/guards/platform-permissions.guard';
import { PlatformJwtAuthGuard } from '../platform-auth/platform-jwt-auth.guard';
import { UpdatePlatformSettingDto } from './dto/update-platform-setting.dto';
import { PlatformSettingsService } from './platform-settings.service';

@UseGuards(PlatformJwtAuthGuard, PlatformPermissionsGuard)
@Controller('platform/settings')
export class PlatformSettingsController {
  constructor(private readonly settingsService: PlatformSettingsService) {}

  @Get()
  @RequirePlatformPermission('platform.subscriptions.manage')
  getAll() {
    return this.settingsService.getEditableSettings();
  }

  @Patch(':key')
  @RequirePlatformPermission('platform.subscriptions.manage')
  update(@Param('key') key: string, @Body() dto: UpdatePlatformSettingDto) {
    return this.settingsService.set(key, dto.value);
  }
}
