import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QuerySubscriptionEventsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['TRIAL_STARTED', 'PURCHASED', 'ADMIN_GRANTED'])
  eventType?: 'TRIAL_STARTED' | 'PURCHASED' | 'ADMIN_GRANTED';

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
