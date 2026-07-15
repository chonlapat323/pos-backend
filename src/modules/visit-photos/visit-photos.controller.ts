import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types';
import { CreateVisitPhotoDto } from './dto/create-visit-photo.dto';
import { VisitPhotosService } from './visit-photos.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('photos')
export class VisitPhotosController {
  constructor(private readonly visitPhotosService: VisitPhotosService) {}

  @Get()
  findAllForMember(
    @CurrentUser() user: CurrentUserPayload,
    @Query('memberId') memberId: string,
  ) {
    return this.visitPhotosService.findAllForMember(user.shopId, memberId);
  }

  @Post()
  @RequirePermission('shop.members.manage')
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateVisitPhotoDto) {
    return this.visitPhotosService.create(user.shopId, dto);
  }

  @Delete(':id')
  @RequirePermission('shop.members.manage')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.visitPhotosService.remove(user.shopId, id);
  }
}
