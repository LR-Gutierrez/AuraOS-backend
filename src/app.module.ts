import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { VehicleEntriesModule } from './vehicle-entries/vehicle-entries.module';
import { BranchesModule } from './branches/branches.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MembershipsModule } from './memberships/memberships.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ChangeJournalModule } from './change-journal/change-journal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    VehicleEntriesModule,
    BranchesModule,
    DashboardModule,
    MembershipsModule,
    AnalyticsModule,
    ChangeJournalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
