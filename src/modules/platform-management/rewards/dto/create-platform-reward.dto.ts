import { IsString } from 'class-validator';
import { CreateRewardDto } from '../../../rewards/dto/create-reward.dto';

export class CreatePlatformRewardDto extends CreateRewardDto {
  @IsString()
  shopId: string;
}
