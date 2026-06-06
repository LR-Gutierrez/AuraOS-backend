import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SyncResponse {
  users: unknown[];
  branches: unknown[];
  vehicleEntries: unknown[];
  memberships: unknown[];
  syncTimestamp: string;
}

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async getAll(since?: string): Promise<SyncResponse> {
    const sinceDate = since ? new Date(since) : new Date('2000-01-01T00:00:00Z');

    if (isNaN(sinceDate.getTime())) {
      sinceDate.setTime(new Date('2000-01-01T00:00:00Z').getTime());
    }

    const now = new Date();

    const [users, branches, vehicleEntries, memberships] =
      await Promise.all([
        this.prisma.user.findMany({
          where: { updatedAt: { gte: sinceDate } },
        }),
        this.prisma.branch.findMany({
          where: { updatedAt: { gte: sinceDate } },
        }),
        this.prisma.vehicleEntry.findMany({
          where: { createdAt: { gte: sinceDate } },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
        this.prisma.membership.findMany({
          where: {
            OR: [
              { updatedAt: { gte: sinceDate } },
              { createdAt: { gte: sinceDate } },
            ],
          },
        }),
      ]);

    return {
      users,
      branches,
      vehicleEntries,
      memberships,
      syncTimestamp: now.toISOString(),
    };
  }
}
