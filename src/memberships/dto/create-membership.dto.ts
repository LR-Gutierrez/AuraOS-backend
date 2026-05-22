import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateMembershipDto {
  @IsString()
  memberName: string;

  @IsOptional()
  @IsString()
  @IsIn(['Regular', 'Premium', 'Elite'])
  tier?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  branchId: string;
}
