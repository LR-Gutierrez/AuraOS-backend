import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FcmController } from './fcm.controller';
import { SyncEventsModule } from '../sync-events/sync-events.module';

@Module({
  imports: [SyncEventsModule],
  controllers: [FcmController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
