import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CustomerRegisterDto {
  @IsString()
  @MinLength(1)
  shopSlug: string;

  @IsString()
  @MinLength(6)
  phone: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
