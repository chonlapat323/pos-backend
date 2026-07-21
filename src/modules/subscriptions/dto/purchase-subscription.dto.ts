import { IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';

export class PurchaseSubscriptionDto {
  @IsString()
  packageId: string;

  @IsOptional()
  @IsIn(['PROMPTPAY', 'CARD'])
  paymentMethod?: 'PROMPTPAY' | 'CARD';

  @ValidateIf((dto: PurchaseSubscriptionDto) => dto.paymentMethod === 'CARD')
  @IsString()
  omiseToken?: string;
}
