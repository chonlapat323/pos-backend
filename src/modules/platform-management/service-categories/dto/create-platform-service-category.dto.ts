import { IsString } from 'class-validator';
import { CreateServiceCategoryDto } from '../../../service-categories/dto/create-service-category.dto';

export class CreatePlatformServiceCategoryDto extends CreateServiceCategoryDto {
  @IsString()
  shopId: string;
}
