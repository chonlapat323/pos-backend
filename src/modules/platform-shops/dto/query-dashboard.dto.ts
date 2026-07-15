import { IsIn, IsOptional, IsString } from 'class-validator';

export type DashboardPeriod = 'today' | 'week' | 'month' | 'all';

export class QueryDashboardDto {
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsIn(['today', 'week', 'month', 'all'])
  period?: DashboardPeriod;
}
