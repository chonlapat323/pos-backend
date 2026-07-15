import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types';
import { CreateRewardDto } from './dto/create-reward.dto';
import { QueryRewardDto } from './dto/query-reward.dto';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { RewardsService } from './rewards.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryRewardDto,
  ) {
    return this.rewardsService.findAll(user.shopId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.rewardsService.findOne(user.shopId, id);
  }

  @Post()
  @RequirePermission('shop.rewards.manage')
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateRewardDto,
  ) {
    return this.rewardsService.create(user.shopId, dto);
  }

  @Patch(':id')
  @RequirePermission('shop.rewards.manage')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRewardDto,
  ) {
    return this.rewardsService.update(user.shopId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('shop.rewards.manage')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.rewardsService.remove(user.shopId, id);
  }

  @Post(':id/redeem')
  redeem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: RedeemRewardDto,
  ) {
    return this.rewardsService.redeem(user.shopId, id, dto.memberId);
  }
}
