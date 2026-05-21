import { IsBoolean, IsOptional, IsString } from "class-validator";

export class ConfigureRoleDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isSystemRole?: boolean;
}
