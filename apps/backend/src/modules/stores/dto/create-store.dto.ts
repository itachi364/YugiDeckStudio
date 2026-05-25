import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  backgroundColor?: string | null;

  @IsOptional()
  @IsString()
  sourceCreditText?: string | null;
}
