import { IsOptional, IsDateString } from 'class-validator';

export class ExitVehicleDto {
  @IsOptional()
  @IsDateString()
  exitedAt?: string;
}
