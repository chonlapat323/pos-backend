import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentPlatformAdminPayload } from './types';

export const CurrentPlatformAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentPlatformAdminPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
