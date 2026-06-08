import { Module } from '@nestjs/common';
import { ChangeJournalController } from './change-journal.controller';
import { ChangeJournalService } from './change-journal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ChangeJournalController],
  providers: [ChangeJournalService],
})
export class ChangeJournalModule {}
