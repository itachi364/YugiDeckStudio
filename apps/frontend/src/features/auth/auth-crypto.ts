const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

type AuthEncryptionKey = {
  keyId: string;
  algorithm: string;
  publicKeyJwk: JsonWebKey;
};

export type EncryptedAuthPayload = {
  encryptedPayload: {
    keyId: string;
    encryptedKey: string;
    iv: string;
    ciphertext: string;
  };
};

declare global {
  interface Window {
    __YUGIDECKSTUDIO_AUTH_ENCRYPTION_KEY__?: AuthEncryptionKey;
  }
}

let cachedEncryptionKey: AuthEncryptionKey | null = null;

export async function encryptAuthPayload(payload: object): Promise<EncryptedAuthPayload> {
  const subtle = window.crypto?.subtle;

  if (!subtle) {
    throw new Error("El navegador no soporta cifrado Web Crypto.");
  }

  const encryptionKey = await getEncryptionKey();
  const publicKey = await subtle.importKey(
    "jwk",
    encryptionKey.publicKeyJwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    false,
    ["encrypt"]
  );
  const aesKey = await subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt"]
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plaintext);
  const rawAesKey = await subtle.exportKey("raw", aesKey);
  const encryptedKey = await subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawAesKey);

  return {
    encryptedPayload: {
      keyId: encryptionKey.keyId,
      encryptedKey: encodeBase64Url(encryptedKey),
      iv: encodeBase64Url(iv),
      ciphertext: encodeBase64Url(ciphertext)
    }
  };
}

async function getEncryptionKey(): Promise<AuthEncryptionKey> {
  if (window.__YUGIDECKSTUDIO_AUTH_ENCRYPTION_KEY__) {
    return window.__YUGIDECKSTUDIO_AUTH_ENCRYPTION_KEY__;
  }

  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  const response = await fetch(`${API_BASE_URL}/auth/encryption-key`);

  if (!response.ok) {
    throw new Error("No fue posible obtener la llave de cifrado.");
  }

  cachedEncryptionKey = (await response.json()) as AuthEncryptionKey;

  return cachedEncryptionKey;
}

function encodeBase64Url(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
