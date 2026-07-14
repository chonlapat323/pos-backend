import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateServiceCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}
