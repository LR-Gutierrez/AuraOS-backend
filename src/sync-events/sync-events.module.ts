import { Module } from '@nestjs/common';
import { SyncEventsController } from './sync-events.controller';
import { SyncEventsService } from './sync-events.service';

@Module({
  controllers: [SyncEventsController],
  providers: [SyncEventsService],
  exports: [SyncEventsService],
})
export class SyncEventsModule {}
