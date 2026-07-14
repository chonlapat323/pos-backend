import { StaffRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  shopId: string;
  role: StaffRole;
  name: string;
}

export interface CurrentUserPayload {
  id: string;
  shopId: string;
  role: StaffRole;
  name: string;
}
