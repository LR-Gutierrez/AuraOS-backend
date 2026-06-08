import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChangeJournalService } from './change-journal.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  PushChangesResponse,
  PullChangesResponse,
  ChangePayload,
} from './change-journal.types';

@Controller('api/v1/changes')
export class ChangeJournalController {
  constructor(
    private readonly service: ChangeJournalService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('push')
  async push(
    @Body('changes') changes: ChangePayload[],
  ): Promise<PushChangesResponse> {
    const result = await this.service.pushChanges(changes);

    const branchIds = new Set<string>();
    const hints = new Set<string>();

    for (const change of changes) {
      hints.add(change.entityType);
      if (change.entityType === 'branch') {
        branchIds.add(change.entityId);
      } else if (change.data?.branchId) {
        branchIds.add(change.data.branchId as string);
      }
    }

    if (branchIds.size > 0) {
      void this.notificationsService.emitJournalNotification({
        changes,
        branchIds: [...branchIds],
        hints: [...hints],
      });
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
