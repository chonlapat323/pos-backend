import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);

export const PLATFORM_PERMISSION_KEY = 'requiredPlatformPermission';
export const RequirePlatformPermission = (permission: string) =>
  SetMetadata(PLATFORM_PERMISSION_KEY, permission);
