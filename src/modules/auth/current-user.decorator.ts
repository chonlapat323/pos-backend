import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserPayload } from './types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
