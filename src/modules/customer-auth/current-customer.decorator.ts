import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentCustomerPayload } from './types';

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentCustomerPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
