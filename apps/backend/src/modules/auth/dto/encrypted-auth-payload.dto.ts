import { Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";

export class EncryptedPayloadDto {
  @IsString()
  keyId!: string;

  @IsString()
  encryptedKey!: string;

  @IsString()
  iv!: string;

  @IsString()
  ciphertext!: string;
}

export class EncryptedAuthPayloadDto {
  @ValidateNested()
  @Type(() => EncryptedPayloadDto)
  encryptedPayload!: EncryptedPayloadDto;
}
