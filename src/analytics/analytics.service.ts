import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const RATE_FIELD: Record<string, string> = {
  motorcycle: 'motorcycleRate',
  light: 'lightVehicleRate',
  heavy: 'heavyVehicleRate',
};

const OVERNIGHT_RATE_FIELD: Record<string, string> = {
  motorcycle: 'motorcycleOvernightRate',
  light: 'lightVehicleOvernightRate',
  heavy: 'heavyVehicleOvernightRate',
};

export interface AnalyticsSummaryResponse {
  branchId: string;
  date: string;
  totalCapacity: number;
  inboundCount: number;
  activeCount: number;
  outboundCount: number;
  totalRevenue: number;
  avgDurationMinutes: number;
  inboundTrendPercent: number;
  activeTrendPercent: number;
  outboundTrendPercent: number;
  revenueTrendPercent: number;
  peakHourRevenue: number;
  peakHourLabel: string;
  inboundThresholdMinutes: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSummary(
    branchId: string,
    dateStr?: string,
    inboundThresholdMinutes = 30,
  ): Promise<AnalyticsSummaryResponse> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    const now = new Date();
    const todayStart = dateStr
      ? new Date(dateStr + 'T00:00:00.000Z')
      : this.getUTCDayStart(now);
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    const thresholdCutoff = new Date(
      (dateStr ? todayEnd.getTime() : now.getTime()) -
        inboundThresholdMinutes * 60 * 1000,
    );

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);

    const totalCapacity =
      branch.motorcycleCapacity +
      branch.lightVehicleCapacity +
      branch.heavyVehicleCapacity;

    const [activeEntries, todayExits, yesterdayActives, yesterdayExits] =
      await Promise.all([
        this.prisma.vehicleEntry.findMany({
          where: { branchId, exitedAt: null },
        }),
        this.prisma.vehicleEntry.findMany({
          where: {
            branchId,
            exitedAt: { gte: todayStart, lt: todayEnd },
          },
          include: { branch: true },
        }),
        this.prisma.vehicleEntry.findMany({
          where: {
            branchId,
            createdAt: { lt: todayStart },
            OR: [{ exitedAt: null }, { exitedAt: { gte: todayStart } }],
          },
        }),
        this.prisma.vehicleEntry.findMany({
          where: {
            branchId,
            exitedAt: { gte: yesterdayStart, lt: todayStart },
          },
          include: { branch: true },
        }),
      ]);

    const inboundCount = activeEntries.filter(
      (e) => e.createdAt >= thresholdCutoff,
    ).length;
    const activeCount = activeEntries.length;
    const outboundCount = todayExits.length;

    let totalRevenue = 0;
    let totalDurationMs = 0;
    const hourlyRevenue: Record<number, number> = {};

    for (const e of todayExits) {
      const flatRate = this.getBranchRate(e.branch, e.vehicleType);
      const overnightRate = this.getBranchOvernightRate(
        e.branch,
        e.vehicleType,
      );
      const fee = this.computeFee(
        flatRate,
        overnightRate,
        e.createdAt,
        e.exitedAt!,
      );
      totalRevenue += fee;
      totalDurationMs += e.exitedAt!.getTime() - e.createdAt.getTime();

      const hour = e.exitedAt!.getUTCHours();
      hourlyRevenue[hour] = (hourlyRevenue[hour] || 0) + fee;
    }

    const avgDurationMinutes =
      outboundCount > 0
        ? Math.round(totalDurationMs / 60000 / outboundCount)
        : 0;

    const peakHourEntries = Object.entries(hourlyRevenue).sort(
      (a, b) => b[1] - a[1],
    );
    let peakHourRevenue = 0;
    let peakHourLabel = '';
    if (peakHourEntries.length > 0) {
      const [peakHourStr, peakRevenue] = peakHourEntries[0];
      peakHourRevenue = Math.round(peakRevenue * 100) / 100;
      const hour = parseInt(peakHourStr, 10);
      peakHourLabel = `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`;
    }

    const yesterdayInboundCutoff = new Date(
      todayStart.getTime() - inboundThresholdMinutes * 60 * 1000,
    );
    const yesterdayInboundCount = yesterdayActives.filter(
      (e) => e.createdAt >= yesterdayInboundCutoff,
    ).length;

    const yesterdayActiveCount = yesterdayActives.length;
    const yesterdayOutboundCount = yesterdayExits.length;

    let yesterdayRevenue = 0;
    for (const e of yesterdayExits) {
      const flatRate = this.getBranchRate(e.branch, e.vehicleType);
      const overnightRate = this.getBranchOvernightRate(
        e.branch,
        e.vehicleType,
      );
      yesterdayRevenue += this.computeFee(
        flatRate,
        overnightRate,
        e.createdAt,
        e.exitedAt!,
      );
    }

    return {
      branchId,
      date: todayStart.toISOString().slice(0, 10),
      totalCapacity,
      inboundCount,
      activeCount,
      outboundCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgDurationMinutes,
      inboundTrendPercent: this.calcTrend(inboundCount, yesterdayInboundCount),
      activeTrendPercent: this.calcTrend(activeCount, yesterdayActiveCount),
      outboundTrendPercent: this.calcTrend(
        outboundCount,
        yesterdayOutboundCount,
      ),
      revenueTrendPercent: this.calcTrend(totalRevenue, yesterdayRevenue),
      peakHourRevenue,
      peakHourLabel,
      inboundThresholdMinutes,
    };
  }

  private calcTrend(current: number, previous: number): number {
    if (previous === 0 && current > 0) return 100;
    if (previous === 0 && current === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private getBranchRate(
    branch: Record<string, unknown>,
    vehicleType: string,
  ): number {
    const field = RATE_FIELD[vehicleType];
    return field ? ((branch[field] as number) ?? 0) : 0;
  }

  private getBranchOvernightRate(
    branch: Record<string, unknown>,
    vehicleType: string,
  ): number {
    const field = OVERNIGHT_RATE_FIELD[vehicleType];
    return field ? ((branch[field] as number) ?? 0) : 0;
  }

  private countCalendarDays(start: Date, end: Date): number {
    const s = Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
    );
    const e = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate(),
    );
    return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
  }

  private computeFee(
    flatRate: number,
    overnightRate: number,
    createdAt: Date,
    exitedAt: Date,
  ): number {
    const days = this.countCalendarDays(createdAt, exitedAt);
    const nights = Math.max(0, days - 1);
    return Math.round((days * flatRate + nights * overnightRate) * 100) / 100;
  }

  private getUTCDayStart(date: Date): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
  }
}
