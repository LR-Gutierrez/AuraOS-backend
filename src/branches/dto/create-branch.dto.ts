import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsNumber,
  IsIn,
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
  @IsString()
  @IsIn(['USD', 'MXN', 'EUR'])
  currency?: string;
}
