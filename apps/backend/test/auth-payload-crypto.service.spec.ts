import { webcrypto } from "node:crypto";
import { AuthPayloadCryptoService } from "../src/modules/auth/infrastructure/auth-payload-crypto.service";

describe("AuthPayloadCryptoService", () => {
  it("decrypts an encrypted authentication payload", async () => {
    const service = new AuthPayloadCryptoService();
    const encryptedPayload = await encryptForService(service, {
      username: "root",
      password: "ChangeMe123!"
    });

    expect(service.decryptJson(encryptedPayload)).toEqual({
      username: "root",
      password: "ChangeMe123!"
    });
  });

  it("rejects payloads encrypted for another key id", async () => {
    const service = new AuthPayloadCryptoService();
    const encryptedPayload = await encryptForService(service, {
      username: "root",
      password: "ChangeMe123!"
    });

    expect(() =>
      service.decryptJson({
        ...encryptedPayload,
        keyId: "expired-key"
      })
    ).toThrow("La llave de cifrado ya no es valida.");
  });
});

async function encryptForService(service: AuthPayloadCryptoService, payload: object) {
  const publicKey = service.getPublicKey();
  const rsaKey = await webcrypto.subtle.importKey(
    "jwk",
    publicKey.publicKeyJwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    false,
    ["encrypt"]
  );
  const aesKey = await webcrypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt"]
  );
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plaintext);
  const rawAesKey = await webcrypto.subtle.exportKey("raw", aesKey);
  const encryptedKey = await webcrypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaKey, rawAesKey);

  return {
    keyId: publicKey.keyId,
    encryptedKey: encodeBase64Url(encryptedKey),
    iv: encodeBase64Url(iv),
    ciphertext: encodeBase64Url(ciphertext)
  };
}

function encodeBase64Url(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);

  return Buffer.from(bytes).toString("base64url");
}
