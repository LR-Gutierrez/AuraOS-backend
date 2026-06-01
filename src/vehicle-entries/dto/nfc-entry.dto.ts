import { IsString } from 'class-validator';

export class NfcEntryDto {
  @IsString()
  cardUuid: string;
}
