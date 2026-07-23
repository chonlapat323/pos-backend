import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { BillsModule } from './modules/bills/bills.module';
import { CustomerAuthModule } from './modules/customer-auth/customer-auth.module';
import { CustomerCatalogModule } from './modules/customer-catalog/customer-catalog.module';
import { CustomerPortalModule } from './modules/customer-portal/customer-portal.module';
import { MembersModule } from './modules/members/members.module';
import { PlatformAuthModule } from './modules/platform-auth/platform-auth.module';
import { PlatformManagementModule } from './modules/platform-management/platform-management.module';
import { PlatformSettingsModule } from './modules/platform-settings/platform-settings.module';
import { PlatformShopsModule } from './modules/platform-shops/platform-shops.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { RolesModule } from './modules/roles/roles.module';
import { ServiceCategoriesModule } from './modules/service-categories/service-categories.module';
import { ServicesModule } from './modules/services/services.module';
import { ShopModule } from './modules/shop/shop.module';
import { StaffModule } from './modules/staff/staff.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { VisitPhotosModule } from './modules/visit-photos/visit-photos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ShopModule,
    ServiceCategoriesModule,
    ServicesModule,
    MembersModule,
    RewardsModule,
    RolesModule,
    StaffModule,
    BillsModule,
    ReportsModule,
    PlatformAuthModule,
    PlatformShopsModule,
    PlatformSettingsModule,
    PlatformManagementModule,
    UploadsModule,
    VisitPhotosModule,
    CustomerAuthModule,
    CustomerCatalogModule,
    CustomerPortalModule,
    SubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
