import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRewardDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsInt()
  @Min(1)
  pointCost: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
