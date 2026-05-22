import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateBranchDto {
  name: string;
  address?: string;
  motorcycleCapacity?: number;
  lightVehicleCapacity?: number;
  heavyVehicleCapacity?: number;
  motorcycleRate?: number;
  lightVehicleRate?: number;
  heavyVehicleRate?: number;
  currency?: string;
}

export class UpdateBranchDto {
  name?: string;
  address?: string;
  motorcycleCapacity?: number;
  lightVehicleCapacity?: number;
  heavyVehicleCapacity?: number;
  motorcycleRate?: number;
  lightVehicleRate?: number;
  heavyVehicleRate?: number;
  currency?: string;
}

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async createBranch(data: CreateBranchDto) {
    return this.prisma.branch.create({
      data: {
        name: data.name,
        address: data.address,
        motorcycleCapacity: data.motorcycleCapacity ?? 0,
        lightVehicleCapacity: data.lightVehicleCapacity ?? 0,
        heavyVehicleCapacity: data.heavyVehicleCapacity ?? 0,
        motorcycleRate: data.motorcycleRate ?? 0.0,
        lightVehicleRate: data.lightVehicleRate ?? 0.0,
        heavyVehicleRate: data.heavyVehicleRate ?? 0.0,
        currency: data.currency ?? 'USD',
      },
    });
  }

  async getAllBranches() {
    return this.prisma.branch.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async getBranchById(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    return branch;
  }

  async updateBranch(id: string, data: UpdateBranchDto) {
    // Check if exists
    await this.getBranchById(id);

    return this.prisma.branch.update({
      where: { id },
      data,
    });
  }

  async deleteBranch(id: string) {
    // Check if exists
    await this.getBranchById(id);

    return this.prisma.branch.delete({
      where: { id },
    });
  }
}
