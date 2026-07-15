import { IsString } from 'class-validator';
import { CreateStaffDto } from '../../../staff/dto/create-staff.dto';

export class CreatePlatformStaffDto extends CreateStaffDto {
  @IsString()
  shopId: string;
}
