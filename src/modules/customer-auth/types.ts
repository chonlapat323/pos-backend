export interface CustomerJwtPayload {
  sub: string;
  shopId: string;
  name: string;
  type: 'customer';
}

export interface CurrentCustomerPayload {
  memberId: string;
  shopId: string;
}
