import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChangeJournalService } from './change-journal.service';
import type {
  PushChangesResponse,
  PullChangesResponse,
  ChangePayload,
} from './change-journal.types';

@Controller('api/v1/changes')
export class ChangeJournalController {
  constructor(private readonly service: ChangeJournalService) {}

  @UseGuards(JwtAuthGuard)
  @Post('push')
  push(
    @Body('changes') changes: ChangePayload[],
  ): Promise<PushChangesResponse> {
    return this.service.pushChanges(changes);
  }

  @UseGuards(JwtAuthGuard)
  @Get('pull')
  pull(
    @Query('since') since?: string,
    @Query('deviceId') deviceId?: string,
  ): Promise<PullChangesResponse> {
    const sinceNum = since ? Number(since) : null;
    return this.service.pullChanges(sinceNum, deviceId ?? '');
  }
}
