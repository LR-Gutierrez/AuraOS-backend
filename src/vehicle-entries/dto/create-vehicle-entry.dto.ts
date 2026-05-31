import { IsString, IsOptional, IsIn, IsBoolean } from 'class-validator';

export class CreateVehicleEntryDto {
  @IsString()
  plate: string;

  @IsString()
  @IsIn(['motorcycle', 'light', 'heavy'])
  vehicleType: string;

  @IsString()
  branchId: string;

  @IsOptional()
  @IsBoolean()
  isVip?: boolean;

  @IsOptional()
  @IsString()
  membershipId?: string;
}
