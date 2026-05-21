import { IsOptional, IsString } from "class-validator";

export class ConfigurePermissionDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}
