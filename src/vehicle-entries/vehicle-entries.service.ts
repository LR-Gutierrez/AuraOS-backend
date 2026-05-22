import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateVehicleEntryData {
  plate: string;
  vehicleType: string;
  branchId: string;
  platePhotoUrl?: string;
  frontPhotoUrl?: string;
  rearPhotoUrl?: string;
  leftPhotoUrl?: string;
  rightPhotoUrl?: string;
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
      // Retornamos un objeto de error estructurado o lanzamos una excepción de NestJS
      throw new Error('No se pudo registrar el vehículo');
    }
  }
}
