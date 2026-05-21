import { IsBoolean, IsOptional, IsString, IsUUID } from "class-validator";

export class ConfigureEventTypeDto {
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
