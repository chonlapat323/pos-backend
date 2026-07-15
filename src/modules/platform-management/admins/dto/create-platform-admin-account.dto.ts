import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePlatformAdminAccountDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;
}
