import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChangeJournalService } from './change-journal.service';
import { SyncEventsService } from '../sync-events/sync-events.service';
import type {
  PushChangesResponse,
  PullChangesResponse,
  ChangePayload,
} from './change-journal.types';

@Controller('api/v1/changes')
export class ChangeJournalController {
  constructor(
    private readonly service: ChangeJournalService,
    private readonly syncEventsService: SyncEventsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('push')
  async push(
    @Body('changes') changes: ChangePayload[],
  ): Promise<PushChangesResponse> {
    const result = await this.service.pushChanges(changes);

    const affectedBranches = new Set<string>();
    const entityHints = new Set<string>();

    for (const change of changes) {
      entityHints.add(change.entityType);
      if (change.entityType === 'branch') {
        affectedBranches.add(change.entityId);
      } else if (change.data?.branchId) {
        affectedBranches.add(change.data.branchId as string);
      }
    }

    if (affectedBranches.size > 0) {
      const latestCursor = String(Date.now());
      for (const branchId of affectedBranches) {
        this.syncEventsService.publish({
          type: 'journal_updated',
          scopeType: 'branch',
          scopeId: branchId,
          latestCursor,
          hints: [...entityHints],
        });
      }
    }

    return result;
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
