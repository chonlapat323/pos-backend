import { PartialType } from '@nestjs/mapped-types';
import { CreatePlatformRoleDto } from './create-platform-role.dto';

export class UpdatePlatformRoleDto extends PartialType(CreatePlatformRoleDto) {}
