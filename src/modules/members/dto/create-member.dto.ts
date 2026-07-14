import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateMemberDto {
  @IsString()
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
  photoUrl?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
