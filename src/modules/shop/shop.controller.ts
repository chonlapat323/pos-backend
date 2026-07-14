import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopService } from './shop.service';

@UseGuards(JwtAuthGuard)
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get()
  findOne(@CurrentUser() user: CurrentUserPayload) {
    return this.shopService.findOne(user.shopId);
  }

  @Patch()
  update(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateShopDto) {
    return this.shopService.update(user.shopId, dto);
  }
}
