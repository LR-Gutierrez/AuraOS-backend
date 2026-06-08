import { Controller, Req, Sse, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SyncEventsService } from './sync-events.service';
import type { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';

@Controller('api/v1/sync')
export class SyncEventsController {
  constructor(private readonly syncEventsService: SyncEventsService) {}

  @UseGuards(JwtAuthGuard)
  @Sse('events')
  events(@Req() req: any): Observable<MessageEvent> {
    return this.syncEventsService.subscribe(req.user.userId);
  }
}
