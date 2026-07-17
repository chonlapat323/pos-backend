import { IsIn, IsOptional } from 'class-validator';

export type ReportsDashboardPeriod = 'today' | 'week' | 'month' | 'all';

export class QueryReportsDashboardDto {
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'all'])
  period?: ReportsDashboardPeriod;
}
