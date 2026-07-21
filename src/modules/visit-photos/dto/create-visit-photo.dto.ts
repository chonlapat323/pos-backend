import { PhotoType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateVisitPhotoDto {
  @IsString()
  memberId: string;

  @IsEnum(PhotoType)
  type: PhotoType;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  billId?: string;
}
