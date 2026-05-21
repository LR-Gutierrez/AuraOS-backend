import { Module } from '@nestjs/common';
import { VehicleEntriesController } from './vehicle-entries.controller';
import { VehicleEntriesService } from './vehicle-entries.service';

@Module({
  controllers: [VehicleEntriesController],
  providers: [VehicleEntriesService],
})
export class VehicleEntriesModule {}
