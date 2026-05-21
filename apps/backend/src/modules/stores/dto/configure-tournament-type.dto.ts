import { IsBoolean, IsOptional, IsString, IsUUID } from "class-validator";

export class ConfigureTournamentTypeDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsUUID()
  logoAssetId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
