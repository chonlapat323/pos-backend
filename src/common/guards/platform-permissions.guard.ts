import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { CurrentPlatformAdminPayload } from '../../modules/platform-auth/types';
import { PLATFORM_PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PlatformPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string | undefined>(
      PLATFORM_PERMISSION_KEY,
      context.getHandler(),
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const admin = request.user as CurrentPlatformAdminPayload | undefined;
    if (!admin) return false;
    if (admin.isSuperAdmin) return true;
    if (admin.permissions?.includes(required)) return true;

    throw new ForbiddenException(`Missing permission: ${required}`);
  }
}
