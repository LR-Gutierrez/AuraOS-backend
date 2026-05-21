import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateVehicleEntryData {
  plate: string;
  vehicleType: string;
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
    try {
      const entry = await this.prisma.vehicleEntry.create({
        data,
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
