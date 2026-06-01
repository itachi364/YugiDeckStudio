import { BadRequestException, Injectable } from "@nestjs/common";
import {
  constants,
  createDecipheriv,
  generateKeyPairSync,
  privateDecrypt,
  randomUUID,
  type KeyObject
} from "node:crypto";
import { EncryptedPayloadDto } from "../dto/encrypted-auth-payload.dto";

@Injectable()
export class AuthPayloadCryptoService {
  private readonly keyId = randomUUID();
  private readonly publicKey: KeyObject;
  private readonly privateKey: KeyObject;

  constructor() {
    const keyPair = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicExponent: 0x10001
    });

    this.publicKey = keyPair.publicKey;
    this.privateKey = keyPair.privateKey;
  }

  getPublicKey() {
    return {
      keyId: this.keyId,
      algorithm: "RSA-OAEP-256+A256GCM",
      publicKeyJwk: this.publicKey.export({ format: "jwk" })
    };
  }

  decryptJson<TPayload extends object>(payload: EncryptedPayloadDto): TPayload {
    if (payload.keyId !== this.keyId) {
      throw new BadRequestException("La llave de cifrado ya no es valida.");
    }

    try {
      const aesKey = privateDecrypt(
        {
          key: this.privateKey,
          oaepHash: "sha256",
          padding: constants.RSA_PKCS1_OAEP_PADDING
        },
        this.decodeBase64Url(payload.encryptedKey)
      );
      const iv = this.decodeBase64Url(payload.iv);
      const encryptedBody = this.decodeBase64Url(payload.ciphertext);
      const authTag = encryptedBody.subarray(encryptedBody.length - 16);
      const ciphertext = encryptedBody.subarray(0, encryptedBody.length - 16);
      const decipher = createDecipheriv("aes-256-gcm", aesKey, iv);
      decipher.setAuthTag(authTag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");

      return JSON.parse(plaintext) as TPayload;
    } catch {
      throw new BadRequestException("No fue posible descifrar la solicitud.");
    }
  }

  private decodeBase64Url(value: string): Buffer {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);

    return Buffer.from(`${normalized}${padding}`, "base64");
  }
}
