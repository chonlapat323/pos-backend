import { IsString, MinLength } from 'class-validator';

export class CustomerLoginDto {
  @IsString()
  @MinLength(1)
  shopSlug: string;

  @IsString()
  @MinLength(6)
  phone: string;
}
