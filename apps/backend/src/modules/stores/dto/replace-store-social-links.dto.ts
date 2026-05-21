import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUrl, IsUUID, ValidateNested } from "class-validator";

export class StoreSocialLinkDto {
  @IsString()
  platform!: string;

  @IsString()
  handle!: string;

  @IsOptional()
  @IsUrl()
  url?: string | null;

  @IsOptional()
  @IsUUID()
  iconAssetId?: string | null;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReplaceStoreSocialLinksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreSocialLinkDto)
  links!: StoreSocialLinkDto[];
}
