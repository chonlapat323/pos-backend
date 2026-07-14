import { IsString } from 'class-validator';

export class RedeemRewardDto {
  @IsString()
  memberId: string;
}
