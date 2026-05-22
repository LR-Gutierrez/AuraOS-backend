import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UseFilters,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { VehicleEntriesService } from './vehicle-entries.service';
import { MulterErrorFilter } from './multer-error.filter';

const uploadDir = join(process.cwd(), 'uploads', 'vehicle-entries');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
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
          destination: uploadDir,
          filename: (req, file, cb) => {
            const randomName = Array(32)
              .fill(null)
              .map(() => Math.round(Math.random() * 16).toString(16))
              .join('');
            return cb(null, `${randomName}${extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
      },
    ),
  )
  async create(
    @Body('plate') plate: string,
    @Body('vehicleType') vehicleType: string,
    @Body('branchId') branchId: string,
    @Body('isVip') isVip: string | undefined,
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
      plate,
      vehicleType,
      branchId,
      isVip: vip,
      platePhotoUrl,
      frontPhotoUrl,
      rearPhotoUrl,
      leftPhotoUrl,
      rightPhotoUrl,
    });
  }
}
