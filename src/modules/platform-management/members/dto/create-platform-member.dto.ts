import { IsString } from 'class-validator';
import { CreateMemberDto } from '../../../members/dto/create-member.dto';

export class CreatePlatformMemberDto extends CreateMemberDto {
  @IsString()
  shopId: string;
}
