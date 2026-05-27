import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsNumber,
  IsIn,
  Matches,
} from 'class-validator';

export class CreateBranchDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  motorcycleCapacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lightVehicleCapacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  heavyVehicleCapacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  motorcycleRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lightVehicleRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heavyVehicleRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  motorcycleOvernightRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lightVehicleOvernightRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heavyVehicleOvernightRate?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  openTimeWeekday?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  closeTimeWeekday?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  openTimeWeekend?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  closeTimeWeekend?: string;

  @IsOptional()
  @IsString()
  @IsIn(['USD', 'MXN', 'EUR'])
  currency?: string;
}
