import { IsArray, IsIn, IsString } from 'class-validator';
import { PLATFORM_PERMISSIONS } from '../../../../common/permissions';

const PERMISSION_KEYS = PLATFORM_PERMISSIONS.map((p) => p.key);

export class CreatePlatformRoleDto {
  @IsString()
  name: string;

  @IsArray()
  @IsIn(PERMISSION_KEYS, { each: true })
  permissions: string[];
}
