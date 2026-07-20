import { IsString } from 'class-validator';

export class GrantShopSubscriptionDto {
  @IsString()
  packageId: string;
}
