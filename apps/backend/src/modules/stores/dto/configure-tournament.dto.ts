import { Transform } from "class-transformer";
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import { TournamentStatus } from "@prisma/client";

const emptyStringToUndefined = ({ value }: { value: unknown }) => (value === "" ? undefined : value);

export class ConfigureTournamentDto {
  @IsUUID()
  eventTypeId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsUUID()
  logoAssetId?: string;

  @IsDateString()
  eventDate!: string;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;
}
