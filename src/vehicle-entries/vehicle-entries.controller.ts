import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseInterceptors,
  UseFilters,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { VehicleEntriesService } from './vehicle-entries.service';
import { MulterErrorFilter } from './multer-error.filter';
import { ExitVehicleDto } from './dto/exit-vehicle.dto';

const uploadBaseDir = join(process.cwd(), 'uploads', 'vehicle-entries');
if (!existsSync(uploadBaseDir)) {
  mkdirSync(uploadBaseDir, { recursive: true });
}

@Controller('api/v1')
@UseFilters(MulterErrorFilter)
export class VehicleEntriesController {
  constructor(private readonly vehicleEntriesService: VehicleEntriesService) {}

  @Post('vehicle-entries')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'platePhoto', maxCount: 1 },
        { name: 'front', maxCount: 1 },
        { name: 'rear', maxCount: 1 },
        { name: 'left', maxCount: 1 },
        { name: 'right', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: (req, file, cb) => {
            const branchId = req.body?.branchId;
            if (!branchId) {
              return cb(new Error('branchId es obligatorio'), '');
            }
            const entryId = req['uploadEntryId'] ?? randomUUID();
            req['uploadEntryId'] = entryId;
            const dir = join(uploadBaseDir, branchId, entryId);
            mkdirSync(dir, { recursive: true });
            cb(null, dir);
          },
          filename: (req, file, cb) => {
            cb(null, `${file.fieldname}${extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
      },
    ),
  )
  async create(
    @Req() req: Request,
    @Body('plate') plate: string,
    @Body('vehicleType') vehicleType: string,
    @Body('branchId') branchId: string,
    @Body('isVip') isVip: string | undefined,
    @Body('membershipId') membershipId: string | undefined,
    @UploadedFiles()
    files: {
      platePhoto?: Express.Multer.File[];
      front?: Express.Multer.File[];
      rear?: Express.Multer.File[];
      left?: Express.Multer.File[];
      right?: Express.Multer.File[];
    },
  ) {
    if (!plate) {
      throw new BadRequestException(
        'El número de placa (plate) es obligatorio.',
      );
    }
    if (!vehicleType) {
      throw new BadRequestException(
        'La categoría del vehículo (vehicleType) es obligatoria.',
      );
    }
    if (!branchId) {
      throw new BadRequestException('La sucursal (branchId) es obligatoria.');
    }

    const entryId = req['uploadEntryId'];

    const platePhotoUrl = files.platePhoto?.[0]?.path;

    if (!platePhotoUrl) {
      throw new BadRequestException(
        'La foto de la placa (platePhoto) es obligatoria.',
      );
    }

    const frontPhotoUrl = files.front?.[0]?.path;
    const rearPhotoUrl = files.rear?.[0]?.path;
    const leftPhotoUrl = files.left?.[0]?.path;
    const rightPhotoUrl = files.right?.[0]?.path;

    const vip = isVip === 'true' || isVip === '1';

    return this.vehicleEntriesService.createEntry({
      id: entryId,
      plate,
      vehicleType,
      branchId,
      isVip: vip,
      membershipId,
      platePhotoUrl,
      frontPhotoUrl,
      rearPhotoUrl,
      leftPhotoUrl,
      rightPhotoUrl,
    });
  }

  @Patch('vehicle-entries/:id/exit')
  @HttpCode(HttpStatus.OK)
  async exit(@Param('id') id: string, @Body() dto: ExitVehicleDto) {
    return this.vehicleEntriesService.exitVehicle(id, dto.exitedAt);
  }

  @Get('vehicle-entries')
  findAll(
    @Query('branchId') branchId?: string,
    @Query('plate') plate?: string,
    @Query('exited') exited?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vehicleEntriesService.findAll({
      branchId,
      plate,
      exited: exited === 'true' ? true : exited === 'false' ? false : undefined,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('vehicle-entries/:id')
  findOne(@Param('id') id: string) {
    return this.vehicleEntriesService.findOne(id);
  }

  @Get('branches/:branchId/entries/summary')
  getSummary(@Param('branchId') branchId: string) {
    return this.vehicleEntriesService.getSummary(branchId);
  }
}
