import { Module } from '@nestjs/common';
import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import { PlatformAdminsController } from './admins/platform-admins.controller';
import { PlatformAdminsService } from './admins/platform-admins.service';
import { PlatformMembersController } from './members/platform-members.controller';
import { PlatformMembersService } from './members/platform-members.service';
import { PlatformRewardsController } from './rewards/platform-rewards.controller';
import { PlatformRewardsService } from './rewards/platform-rewards.service';
import { PlatformRolesController } from './roles/platform-roles.controller';
import { PlatformRolesService } from './roles/platform-roles.service';
import { PlatformServiceCategoriesController } from './service-categories/platform-service-categories.controller';
import { PlatformServiceCategoriesService } from './service-categories/platform-service-categories.service';
import { PlatformServicesController } from './services/platform-services.controller';
import { PlatformServicesService } from './services/platform-services.service';
import { PlatformStaffController } from './staff/platform-staff.controller';
import { PlatformStaffService } from './staff/platform-staff.service';

@Module({
  imports: [PlatformAuthModule],
  controllers: [
    PlatformServiceCategoriesController,
    PlatformServicesController,
    PlatformMembersController,
    PlatformRewardsController,
    PlatformStaffController,
    PlatformRolesController,
    PlatformAdminsController,
  ],
  providers: [
    PlatformServiceCategoriesService,
    PlatformServicesService,
    PlatformMembersService,
    PlatformRewardsService,
    PlatformStaffService,
    PlatformRolesService,
    PlatformAdminsService,
  ],
})
export class PlatformManagementModule {}
