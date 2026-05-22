import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ExpiringMembership {
  memberName: string;
  tier: string;
  timeLeft: string;
}

export interface VipArrival {
  guestName: string;
  slot: string;
}

export interface DashboardResponse {
  occupancyPercent: number;
  occupiedBays: number;
  totalBays: number;
  trendPercent: number;
  dailyRevenue: number;
  activeMemberships: number;
  totalMemberships: number;
  criticalAlertsCount: number;
  expiringMemberships: ExpiringMembership[];
  vipArrivals: VipArrival[];
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(branchId: string): Promise<DashboardResponse> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [
      todayEntries,
      yesterdayEntries,
      totalMemberships,
      activeMemberships,
      expiringMemberships,
      vipEntries,
    ] = await Promise.all([
      this.prisma.vehicleEntry.findMany({
        where: { branchId, createdAt: { gte: todayStart } },
      }),
      this.prisma.vehicleEntry.findMany({
        where: {
          branchId,
          createdAt: { gte: yesterdayStart, lt: todayStart },
        },
      }),
      this.prisma.membership.count({ where: { branchId } }),
      this.prisma.membership.count({ where: { branchId, isActive: true } }),
      this.prisma.membership.findMany({
        where: {
          branchId,
          isActive: true,
          endDate: {
            gte: now,
            lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        select: { memberName: true, tier: true, endDate: true },
      }),
      this.prisma.vehicleEntry.findMany({
        where: {
          branchId,
          isVip: true,
          createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const typeMultiplier: Record<string, number> = {
      motorcycle: 1,
      light: 1,
      heavy: 3,
    };

    const countByType = (entries: typeof todayEntries) => {
      let equivalent = 0;
      for (const e of entries) {
        equivalent += typeMultiplier[e.vehicleType] ?? 1;
      }
      return equivalent;
    };

    const occupiedEquivalent = countByType(todayEntries);
    const yesterdayOccupiedEquivalent = countByType(yesterdayEntries);

    const totalEquivalentCapacity =
      branch.motorcycleCapacity * 1 +
      branch.lightVehicleCapacity * 1 +
      branch.heavyVehicleCapacity * 3;

    const occupancyPercent =
      totalEquivalentCapacity > 0
        ? Math.round((occupiedEquivalent / totalEquivalentCapacity) * 100)
        : 0;

    const totalBays = totalEquivalentCapacity;
    const occupiedBays = occupiedEquivalent;

    const trendPercent =
      yesterdayOccupiedEquivalent > 0
        ? Math.round(
            ((occupiedEquivalent - yesterdayOccupiedEquivalent) /
              yesterdayOccupiedEquivalent) *
              100,
          )
        : occupiedEquivalent > 0
          ? 100
          : 0;

    const vehicleCounts = { motorcycle: 0, light: 0, heavy: 0 };
    for (const e of todayEntries) {
      if (e.vehicleType === 'motorcycle') vehicleCounts.motorcycle++;
      else if (e.vehicleType === 'light') vehicleCounts.light++;
      else if (e.vehicleType === 'heavy') vehicleCounts.heavy++;
    }

    const dailyRevenue =
      vehicleCounts.motorcycle * branch.motorcycleRate +
      vehicleCounts.light * branch.lightVehicleRate +
      vehicleCounts.heavy * branch.heavyVehicleRate;

    const criticalAlertsCount = expiringMemberships.length;

    const expiringMembershipsResponse = expiringMemberships.map((m) => ({
      memberName: m.memberName,
      tier: m.tier,
      timeLeft: this.formatTimeLeft(m.endDate),
    }));

    const vipArrivalsResponse = vipEntries.map((v, i) => ({
      guestName: v.plate,
      slot: `VIP-${i + 1}`,
    }));

    return {
      occupancyPercent,
      occupiedBays,
      totalBays,
      trendPercent,
      dailyRevenue: Math.round(dailyRevenue * 100) / 100,
      activeMemberships,
      totalMemberships,
      criticalAlertsCount,
      expiringMemberships: expiringMembershipsResponse,
      vipArrivals: vipArrivalsResponse,
    };
  }

  private formatTimeLeft(endDate: Date): string {
    const diffMs = endDate.getTime() - Date.now();
    if (diffMs <= 0) return '0m';

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}
