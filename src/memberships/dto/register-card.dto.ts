import { IsString } from 'class-validator';

export class RegisterCardDto {
  @IsString()
  cardUuid: string;
}
