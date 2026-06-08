import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/fcm')
export class FcmController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Post('token')
  async registerToken(@Req() req: any, @Body('token') token: string) {
    if (!token) {
      throw new BadRequestException('token es obligatorio');
    }

    await this.prisma.fcmToken.upsert({
      where: { token },
      update: { userId: req.user.userId },
      create: { token, userId: req.user.userId },
    });

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('token')
  async unregisterToken(@Body('token') token: string) {
    if (!token) {
      throw new BadRequestException('token es obligatorio');
    }

    await this.prisma.fcmToken.deleteMany({ where: { token } });
    return { success: true };
  }
}
