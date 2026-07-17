import { Body, Controller, Post } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerLoginDto } from './dto/login.dto';

@Controller('customer-auth')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('login')
  login(@Body() dto: CustomerLoginDto) {
    return this.customerAuthService.login(dto);
  }
}
