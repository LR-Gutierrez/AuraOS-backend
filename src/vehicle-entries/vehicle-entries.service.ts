import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const VALID_VEHICLE_TYPES = ['motorcycle', 'light', 'heavy'] as const;

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

export interface CreateVehicleEntryData {
  id?: string;
  plate: string;
  vehicleType: string;
  branchId: string;
  isVip?: boolean;
  membershipId?: string;
  platePhotoUrl?: string;
  frontPhotoUrl?: string;
  rearPhotoUrl?: string;
  leftPhotoUrl?: string;
  rightPhotoUrl?: string;
}

export interface VehicleEntryFilters {
  branchId?: string;
  plate?: string;
  membershipId?: string;
  exited?: boolean;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class VehicleEntriesService {
  constructor(private prisma: PrismaService) {}

  private toRelativeUrl(absolutePath: string | undefined): string | null {
    if (!absolutePath) return null;
    const idx = absolutePath.indexOf('uploads');
    return idx !== -1 ? absolutePath.slice(idx) : absolutePath;
  }

  private computeDuration(createdAt: Date, exitedAt: Date): string {
    const diffMs = exitedAt.getTime() - createdAt.getTime();
    if (diffMs <= 0) return '0m';

    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    return parts.join(' ');
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

  private formatEntry(entry: any) {
    const branch = entry.branch;
    const vt = entry.vehicleType?.toLowerCase();
    const rateField = RATE_FIELD[vt];
    const overnightField = OVERNIGHT_RATE_FIELD[vt];
    const flatRate = rateField ? (branch?.[rateField] ?? 0) : 0;
    const overnightRate = overnightField ? (branch?.[overnightField] ?? 0) : 0;

    let duration: string | null = null;
    let fee: number | null = null;

    if (entry.exitedAt) {
      duration = this.computeDuration(entry.createdAt, entry.exitedAt);
      fee = entry.membershipId
        ? 0
        : this.computeFee(
            flatRate,
            overnightRate,
            entry.createdAt,
            entry.exitedAt,
          );
    }

    return {
      id: entry.id,
      plate: entry.plate,
      vehicleType: entry.vehicleType,
      isVip: entry.isVip,
      membershipId: entry.membershipId,
      memberName: entry.membership?.memberName ?? null,
      branchId: entry.branchId,
      platePhotoUrl: this.toRelativeUrl(entry.platePhotoUrl),
      frontPhotoUrl: this.toRelativeUrl(entry.frontPhotoUrl),
      rearPhotoUrl: this.toRelativeUrl(entry.rearPhotoUrl),
      leftPhotoUrl: this.toRelativeUrl(entry.leftPhotoUrl),
      rightPhotoUrl: this.toRelativeUrl(entry.rightPhotoUrl),
      exitedAt: entry.exitedAt,
      createdAt: entry.createdAt,
      duration,
      fee,
      branch: entry.branch,
    };
  }

  async createEntry(data: CreateVehicleEntryData) {
    const vehicleType = data.vehicleType?.toLowerCase();

    if (!VALID_VEHICLE_TYPES.includes(vehicleType as any)) {
      throw new BadRequestException(
        `vehicleType inválido: "${data.vehicleType}". Valores permitidos: ${VALID_VEHICLE_TYPES.join(', ')}`,
      );
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: data.branchId },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${data.branchId} not found`);
    }

    if (data.membershipId) {
      const membership = await this.prisma.membership.findUnique({
        where: { id: data.membershipId },
      });

      if (!membership) {
        throw new NotFoundException(
          `Membership with ID ${data.membershipId} not found`,
        );
      }

      if (!membership.isActive || membership.endDate <= new Date()) {
        throw new BadRequestException('La membresía no está activa');
      }

      if (membership.branchId !== data.branchId) {
        throw new BadRequestException(
          'La membresía no pertenece a esta sucursal',
        );
      }

      const activeEntry = await this.prisma.vehicleEntry.findFirst({
        where: { membershipId: data.membershipId, exitedAt: null },
      });

      if (activeEntry) {
        throw new BadRequestException(
          'El socio ya tiene un vehículo activo en el estacionamiento',
        );
      }
    }

    try {
      const entry = await this.prisma.vehicleEntry.create({
        data: {
          ...(data.id && { id: data.id }),
          plate: data.plate,
          vehicleType,
          branchId: data.branchId,
          isVip: data.membershipId ? true : (data.isVip ?? false),
          membershipId: data.membershipId,
          platePhotoUrl: data.platePhotoUrl,
          frontPhotoUrl: data.frontPhotoUrl,
          rearPhotoUrl: data.rearPhotoUrl,
          leftPhotoUrl: data.leftPhotoUrl,
          rightPhotoUrl: data.rightPhotoUrl,
        },
        include: { branch: true, membership: true },
      });

      return {
        success: true,
        message: 'Ingreso registrado exitosamente en SmartPark Server',
        data: this.formatEntry(entry),
      };
    } catch (error) {
      console.error('Error al registrar el ingreso del vehículo:', error);
      throw new Error('No se pudo registrar el vehículo');
    }
  }

  async nfcEntry(cardUuid: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { cardUuid },
    });

    if (!membership) {
      throw new NotFoundException(
        `No se encontró una membresía con la tarjeta ${cardUuid}`,
      );
    }

    if (!membership.isActive || membership.endDate <= new Date()) {
      throw new BadRequestException('La membresía no está activa');
    }

    const activeEntry = await this.prisma.vehicleEntry.findFirst({
      where: { membershipId: membership.id, exitedAt: null },
    });

    if (activeEntry) {
      throw new BadRequestException(
        'El socio ya tiene un vehículo activo en el estacionamiento',
      );
    }

    const entry = await this.prisma.vehicleEntry.create({
      data: {
        plate: 'NFC',
        vehicleType: 'light',
        branchId: membership.branchId,
        isVip: true,
        membershipId: membership.id,
      },
      include: { branch: true, membership: true },
    });

    return {
      success: true,
      message: 'Ingreso registrado exitosamente por NFC',
      data: this.formatEntry(entry),
    };
  }

  async exitVehicle(id: string, exitedAt?: string) {
    const entry = await this.prisma.vehicleEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException(`Vehicle entry with ID ${id} not found`);
    }

    if (entry.exitedAt) {
      throw new BadRequestException('El vehículo ya registró su salida');
    }

    const updated = await this.prisma.vehicleEntry.update({
      where: { id },
      data: { exitedAt: exitedAt ? new Date(exitedAt) : new Date() },
      include: { branch: true, membership: true },
    });

    return {
      success: true,
      message: 'Salida registrada exitosamente',
      data: this.formatEntry(updated),
    };
  }

  async findAll(filters?: VehicleEntryFilters) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters?.plate) {
      where.plate = { contains: filters.plate, mode: 'insensitive' };
    }

    if (filters?.membershipId) {
      where.membershipId = filters.membershipId;
    }

    if (filters?.exited === true) {
      where.exitedAt = { not: null };
    } else if (filters?.exited === false) {
      where.exitedAt = null;
    }

    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) {
        const toDate = new Date(filters.to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicleEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { branch: true, membership: true },
      }),
      this.prisma.vehicleEntry.count({ where }),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const exitedToday = data.filter(
      (e) => e.exitedAt && e.exitedAt >= todayStart,
    );

    let todayRevenue = 0;
    for (const e of exitedToday) {
      if (e.membershipId) continue;
      const vt = e.vehicleType?.toLowerCase();
      const rateField = RATE_FIELD[vt];
      const overnightField = OVERNIGHT_RATE_FIELD[vt];
      const flatRate = (e.branch as any)?.[rateField] ?? 0;
      const overnightRate = (e.branch as any)?.[overnightField] ?? 0;
      todayRevenue += this.computeFee(
        flatRate,
        overnightRate,
        e.createdAt,
        e.exitedAt!,
      );
    }

    return {
      data: data.map((e) => this.formatEntry(e)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        todaySummary: {
          exitedCount: exitedToday.length,
          totalRevenue: Math.round(todayRevenue * 100) / 100,
        },
      },
    };
  }

  async findOne(id: string) {
    const entry = await this.prisma.vehicleEntry.findUnique({
      where: { id },
      include: { branch: true, membership: true },
    });

    if (!entry) {
      throw new NotFoundException(`Vehicle entry with ID ${id} not found`);
    }

    return this.formatEntry(entry);
  }

  async getSummary(branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayExits = await this.prisma.vehicleEntry.findMany({
      where: {
        branchId,
        exitedAt: { not: null, gte: todayStart },
      },
      include: { branch: true, membership: true },
    });

    let todayRevenue = 0;
    let totalDurationMs = 0;

    for (const e of todayExits) {
      if (e.membershipId) continue;
      const vt = e.vehicleType?.toLowerCase();
      const rateField = RATE_FIELD[vt];
      const overnightField = OVERNIGHT_RATE_FIELD[vt];
      const flatRate = (e.branch as any)?.[rateField] ?? 0;
      const overnightRate = (e.branch as any)?.[overnightField] ?? 0;
      todayRevenue += this.computeFee(
        flatRate,
        overnightRate,
        e.createdAt,
        e.exitedAt!,
      );
      totalDurationMs += e.exitedAt!.getTime() - e.createdAt.getTime();
    }

    const avgMinutes =
      todayExits.length > 0
        ? Math.floor(totalDurationMs / 60000 / todayExits.length)
        : 0;

    const avgHours = Math.floor(avgMinutes / 60);
    const avgMins = avgMinutes % 60;
    const averageStay =
      avgHours > 0 ? `${avgHours}h ${avgMins}m` : `${avgMins}m`;

    const peakExitHour =
      todayExits.length > 0
        ? todayExits
            .map((e) => e.exitedAt!.getHours())
            .reduce(
              (acc, h) => {
                acc[h] = (acc[h] || 0) + 1;
                return acc;
              },
              {} as Record<number, number>,
            )
        : {};

    const peakHour = Object.entries(peakExitHour).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    return {
      todayExits: todayExits.length,
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      averageStay,
      peakExitHour: peakHour ? parseInt(peakHour, 10) : null,
    };
  }
}
