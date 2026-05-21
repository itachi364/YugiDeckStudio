import { IsOptional, IsString, IsUUID, Matches } from "class-validator";

export class UpdateStoreConfigurationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  primaryLogoAssetId?: string | null;

  @IsOptional()
  @IsUUID()
  secondaryLogoAssetId?: string | null;

  @IsOptional()
  @IsUUID()
  backgroundImageAssetId?: string | null;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  backgroundColor?: string | null;

  @IsOptional()
  @IsString()
  sourceCreditText?: string | null;
}
