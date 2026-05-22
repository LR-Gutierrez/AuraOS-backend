import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';

@Injectable()
export class MembershipsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMembershipDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${dto.branchId} not found`);
    }

    return this.prisma.membership.create({
      data: {
        memberName: dto.memberName,
        tier: dto.tier ?? 'Regular',
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: dto.isActive ?? true,
        branchId: dto.branchId,
      },
    });
  }

  async findAll(branchId?: string) {
    return this.prisma.membership.findMany({
      where: branchId ? { branchId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id },
    });
    if (!membership) {
      throw new NotFoundException(`Membership with ID ${id} not found`);
    }
    return membership;
  }

  async update(id: string, dto: UpdateMembershipDto) {
    await this.findOne(id);
    return this.prisma.membership.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.membership.delete({ where: { id } });
  }
}
