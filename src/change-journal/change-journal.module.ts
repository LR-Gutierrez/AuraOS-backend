import { Module } from '@nestjs/common';
import { ChangeJournalController } from './change-journal.controller';
import { ChangeJournalService } from './change-journal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SyncEventsModule } from '../sync-events/sync-events.module';

@Module({
  imports: [PrismaModule, SyncEventsModule],
  controllers: [ChangeJournalController],
  providers: [ChangeJournalService],
})
export class ChangeJournalModule {}
