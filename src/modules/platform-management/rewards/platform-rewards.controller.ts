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
import { RequirePlatformPermission } from '../../../common/decorators/require-permission.decorator';
import { PlatformPermissionsGuard } from '../../../common/guards/platform-permissions.guard';
import { PlatformJwtAuthGuard } from '../../platform-auth/platform-jwt-auth.guard';
import { UpdateRewardDto } from '../../rewards/dto/update-reward.dto';
import { CreatePlatformRewardDto } from './dto/create-platform-reward.dto';
import { QueryPlatformRewardDto } from './dto/query-platform-reward.dto';
import { PlatformRewardsService } from './platform-rewards.service';

@UseGuards(PlatformJwtAuthGuard, PlatformPermissionsGuard)
@Controller('platform/rewards')
export class PlatformRewardsController {
  constructor(private readonly service: PlatformRewardsService) {}

  @Get()
  findAll(@Query() query: QueryPlatformRewardDto) {
    return this.service.findAll(query);
  }

  @Post()
  @RequirePlatformPermission('platform.rewards.manage')
  create(@Body() dto: CreatePlatformRewardDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePlatformPermission('platform.rewards.manage')
  update(@Param('id') id: string, @Body() dto: UpdateRewardDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePlatformPermission('platform.rewards.manage')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
