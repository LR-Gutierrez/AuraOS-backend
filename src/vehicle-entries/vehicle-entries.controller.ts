import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { VehicleEntriesService } from './vehicle-entries.service';

@Controller('api/v1')
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
          destination: './uploads/vehicle-entries',
          filename: (req, file, cb) => {
            const randomName = Array(32)
              .fill(null)
              .map(() => Math.round(Math.random() * 16).toString(16))
              .join('');
            return cb(null, `${randomName}${extname(file.originalname)}`);
          },
        }),
      },
    ),
  )
  async create(
    @Body('plate') plate: string,
    @Body('vehicleType') vehicleType: string,
    @Body('branchId') branchId: string,
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
      throw new BadRequestException('El número de placa (plate) es obligatorio.');
    }
    if (!vehicleType) {
      throw new BadRequestException('La categoría del vehículo (vehicleType) es obligatoria.');
    }
    if (!branchId) {
      throw new BadRequestException('La sucursal (branchId) es obligatoria.');
    }

    // Convert to relative paths that could be served
    const platePhotoUrl = files.platePhoto?.[0]?.path;
    
    if (!platePhotoUrl) {
      throw new BadRequestException('La foto de la placa (platePhoto) es obligatoria.');
    }

    const frontPhotoUrl = files.front?.[0]?.path;
    const rearPhotoUrl = files.rear?.[0]?.path;
    const leftPhotoUrl = files.left?.[0]?.path;
    const rightPhotoUrl = files.right?.[0]?.path;

    return this.vehicleEntriesService.createEntry({
      plate,
      vehicleType,
      branchId,
      platePhotoUrl,
      frontPhotoUrl,
      rearPhotoUrl,
      leftPhotoUrl,
      rightPhotoUrl,
    });
  }
}
