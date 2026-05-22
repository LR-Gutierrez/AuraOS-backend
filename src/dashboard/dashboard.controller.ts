import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('api/v1/branches')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':branchId/dashboard')
  getDashboard(@Param('branchId') branchId: string) {
    return this.dashboardService.getDashboard(branchId);
  }
}
