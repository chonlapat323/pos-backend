import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class BillItemInput {
  @IsString()
  serviceId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateBillDto {
  @IsOptional()
  @IsString()
  memberId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemInput)
  items: BillItemInput[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pointsUsed?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
