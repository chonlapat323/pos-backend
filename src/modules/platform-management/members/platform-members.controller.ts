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
import { UpdateMemberDto } from '../../members/dto/update-member.dto';
import { CreatePlatformMemberDto } from './dto/create-platform-member.dto';
import { QueryPlatformMemberDto } from './dto/query-platform-member.dto';
import { PlatformMembersService } from './platform-members.service';

@UseGuards(PlatformJwtAuthGuard, PlatformPermissionsGuard)
@Controller('platform/members')
export class PlatformMembersController {
  constructor(private readonly service: PlatformMembersService) {}

  @Get()
  findAll(@Query() query: QueryPlatformMemberDto) {
    return this.service.findAll(query);
  }

  @Post()
  @RequirePlatformPermission('platform.members.manage')
  create(@Body() dto: CreatePlatformMemberDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePlatformPermission('platform.members.manage')
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePlatformPermission('platform.members.manage')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
