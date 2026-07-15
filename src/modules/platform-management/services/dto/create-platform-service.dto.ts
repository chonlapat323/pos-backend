import { IsString } from 'class-validator';
import { CreateServiceDto } from '../../../services/dto/create-service.dto';

export class CreatePlatformServiceDto extends CreateServiceDto {
  @IsString()
  shopId: string;
}
