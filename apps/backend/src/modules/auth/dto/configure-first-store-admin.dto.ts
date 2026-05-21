import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class ConfigureFirstStoreAdminDto {
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsString()
  storeName?: string;

  @IsString()
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
