import { Module } from '@nestjs/common';
import { VehicleEntriesController } from './vehicle-entries.controller';
import { VehicleEntriesService } from './vehicle-entries.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [VehicleEntriesController],
  providers: [VehicleEntriesService],
})
export class VehicleEntriesModule {}
