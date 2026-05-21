import { IsOptional, IsString } from "class-validator";

export class InactivateDeckDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
