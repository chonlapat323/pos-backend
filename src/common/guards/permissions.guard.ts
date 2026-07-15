import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { CurrentUserPayload } from '../../modules/auth/types';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string | undefined>(
      PERMISSION_KEY,
      context.getHandler(),
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload | undefined;
    if (!user) return false;
    if (user.role === 'OWNER') return true;
    if (user.permissions?.includes(required)) return true;

    throw new ForbiddenException(`Missing permission: ${required}`);
  }
}
