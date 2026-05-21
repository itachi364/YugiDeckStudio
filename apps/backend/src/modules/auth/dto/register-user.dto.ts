import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class RegisterUserDto {
  @IsUUID()
  storeId!: string;

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
