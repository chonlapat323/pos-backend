import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtLenientAuthGuard } from '../auth/jwt-lenient-auth.guard';
import type { CurrentUserPayload } from '../auth/types';
import { PurchaseSubscriptionDto } from './dto/purchase-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@UseGuards(JwtLenientAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  private requireOwner(user: CurrentUserPayload) {
    if (user.role !== 'OWNER') {
      throw new ForbiddenException(
        'Only the shop owner can manage subscriptions',
      );
    }
  }

  @Get('packages')
  listPackages(@CurrentUser() user: CurrentUserPayload) {
    this.requireOwner(user);
    return this.subscriptionsService.listPurchasablePackages();
  }

  @Get('me')
  getMe(@CurrentUser() user: CurrentUserPayload) {
    this.requireOwner(user);
    return this.subscriptionsService.getMySubscription(user.shopId);
  }

  @Post('purchase')
  purchase(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: PurchaseSubscriptionDto,
  ) {
    this.requireOwner(user);
    return this.subscriptionsService.purchase(user.shopId, dto.packageId);
  }

  @Get('purchase/:paymentId/status')
  getPurchaseStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('paymentId') paymentId: string,
  ) {
    this.requireOwner(user);
    return this.subscriptionsService.getPurchaseStatus(user.shopId, paymentId);
  }

  @Get('history')
  getHistory(@CurrentUser() user: CurrentUserPayload) {
    this.requireOwner(user);
    return this.subscriptionsService.getHistory(user.shopId);
  }
}
