import { PartialType } from '@nestjs/mapped-types';
import { CreatePlatformAdminAccountDto } from './create-platform-admin-account.dto';

export class UpdatePlatformAdminAccountDto extends PartialType(
  CreatePlatformAdminAccountDto,
) {}
