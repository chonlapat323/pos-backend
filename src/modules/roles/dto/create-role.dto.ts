import { IsArray, IsIn, IsString } from 'class-validator';
import { SHOP_PERMISSIONS } from '../../../common/permissions';

const PERMISSION_KEYS = SHOP_PERMISSIONS.map((p) => p.key);

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsArray()
  @IsIn(PERMISSION_KEYS, { each: true })
  permissions: string[];
}
