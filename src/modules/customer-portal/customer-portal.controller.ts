import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentCustomer } from '../customer-auth/current-customer.decorator';
import { CustomerJwtAuthGuard } from '../customer-auth/customer-jwt-auth.guard';
import type { CurrentCustomerPayload } from '../customer-auth/types';
import { CustomerPortalService } from './customer-portal.service';

@UseGuards(CustomerJwtAuthGuard)
@Controller('customer-portal')
export class CustomerPortalController {
  constructor(private readonly customerPortalService: CustomerPortalService) {}

  @Get('me')
  me(@CurrentCustomer() customer: CurrentCustomerPayload) {
    return this.customerPortalService.getMe(customer.shopId, customer.memberId);
  }

  @Get('rewards')
  rewards(@CurrentCustomer() customer: CurrentCustomerPayload) {
    return this.customerPortalService.getRewards(
      customer.shopId,
      customer.memberId,
    );
  }
}
