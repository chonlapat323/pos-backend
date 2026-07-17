import { ShopType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateShopDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  openTime?: string;

  @IsOptional()
  @IsString()
  closeTime?: string;

  @IsOptional()
  @IsEnum(ShopType)
  shopType?: ShopType;

  @IsOptional()
  @IsInt()
  @Min(1)
  bahtPerPoint?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  signupBonusPoints?: number;
}
