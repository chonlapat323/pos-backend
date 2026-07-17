export interface CustomerJwtPayload {
  sub: string;
  shopId: string;
  type: 'customer';
}

export interface CurrentCustomerPayload {
  memberId: string;
  shopId: string;
}
