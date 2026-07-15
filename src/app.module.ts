import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { BillsModule } from './modules/bills/bills.module';
import { MembersModule } from './modules/members/members.module';
import { PlatformAuthModule } from './modules/platform-auth/platform-auth.module';
import { PlatformManagementModule } from './modules/platform-management/platform-management.module';
import { PlatformShopsModule } from './modules/platform-shops/platform-shops.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { RolesModule } from './modules/roles/roles.module';
import { ServiceCategoriesModule } from './modules/service-categories/service-categories.module';
import { ServicesModule } from './modules/services/services.module';
import { ShopModule } from './modules/shop/shop.module';
import { StaffModule } from './modules/staff/staff.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
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
    PlatformManagementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
