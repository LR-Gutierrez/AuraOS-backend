import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SyncService, SyncResponse } from './sync.service';

@Controller('api/v1/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getAll(@Query('since') since?: string): Promise<SyncResponse> {
    return this.syncService.getAll(since);
  }
}
