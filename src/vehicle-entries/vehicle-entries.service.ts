import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateVehicleEntryData {
  plate: string;
  vehicleType: string;
  branchId: string;
  isVip?: boolean;
  platePhotoUrl?: string;
  frontPhotoUrl?: string;
  rearPhotoUrl?: string;
  leftPhotoUrl?: string;
  rightPhotoUrl?: string;
}

export interface VehicleEntryFilters {
  branchId?: string;
  exited?: boolean;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class VehicleEntriesService {
  constructor(private prisma: PrismaService) {}

  async createEntry(data: CreateVehicleEntryData) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: data.branchId },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${data.branchId} not found`);
    }

    try {
      const entry = await this.prisma.vehicleEntry.create({
        data,
        include: { branch: true },
      });

      return {
        success: true,
        message: 'Ingreso registrado exitosamente en SmartPark Server',
        data: entry,
      };
    } catch (error) {
      console.error('Error al registrar el ingreso del vehículo:', error);
      throw new Error('No se pudo registrar el vehículo');
    }
  }

  async exitVehicle(id: string, exitedAt?: string) {
    const entry = await this.prisma.vehicleEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException(`Vehicle entry with ID ${id} not found`);
    }

    if (entry.exitedAt) {
      throw new Error('El vehículo ya registró su salida');
    }

    const updated = await this.prisma.vehicleEntry.update({
      where: { id },
      data: { exitedAt: exitedAt ? new Date(exitedAt) : new Date() },
    });

    return {
      success: true,
      message: 'Salida registrada exitosamente',
      data: updated,
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

    if (filters?.exited === true) {
      where.exitedAt = { not: null };
    } else if (filters?.exited === false) {
      where.exitedAt = null;
    }

    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicleEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { branch: true },
      }),
      this.prisma.vehicleEntry.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const entry = await this.prisma.vehicleEntry.findUnique({
      where: { id },
      include: { branch: true },
    });

    if (!entry) {
      throw new NotFoundException(`Vehicle entry with ID ${id} not found`);
    }

    return entry;
  }
}
