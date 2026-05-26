import { Transform } from "class-transformer";
import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

const emptyStringToUndefined = ({ value }: { value: unknown }) => (value === "" ? undefined : value);

export class UploadDeckListDto {
  @IsUUID()
  storeId!: string;

  @IsString()
  @MinLength(1)
  playerName!: string;

  @IsDateString()
  tournamentDate!: string;

  @IsString()
  @MinLength(1)
  resultLabel!: string;

  @IsString()
  @MinLength(1)
  deckName!: string;

  @IsString()
  @MinLength(1)
  neuronDeckUrl!: string;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  tournamentName?: string;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsUUID()
  eventTypeId?: string;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsUUID()
  tournamentTypeId?: string;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  location?: string;
}
