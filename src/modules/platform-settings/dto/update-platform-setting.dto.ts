import { IsString } from 'class-validator';

export class UpdatePlatformSettingDto {
  @IsString()
  value: string;
}
