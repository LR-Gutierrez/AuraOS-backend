import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  getSummary(
    @Query('branchId') branchId: string,
    @Query('date') date?: string,
    @Query('inboundThresholdMinutes') inboundThresholdMinutes?: string,
  ) {
    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }

    return this.analyticsService.getSummary(
      branchId,
      date,
      inboundThresholdMinutes ? parseInt(inboundThresholdMinutes, 10) : 30,
    );
  }
}
