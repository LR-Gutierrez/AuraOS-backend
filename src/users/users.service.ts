import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async updateBiometricKey(userId: string, publicKey: string): Promise<boolean> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { biometricPublicKey: publicKey },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async create(data: any): Promise<User> {
    return this.prisma.user.create({ data });
  }
}