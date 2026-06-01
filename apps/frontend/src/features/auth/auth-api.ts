import { encryptAuthPayload } from "./auth-crypto";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  storeId: string | null;
  isRoot: boolean;
  mustChangePassword: boolean;
  roles: string[];
};

export type LoginResponse = {
  accessToken: string;
  expiresIn: string;
  user: AuthUser;
};

export type RegisterUserResponse = {
  userId: string;
  username: string;
  storeId: string;
  roles: string[];
};

export type ChangePasswordResponse = {
  userId: string;
  mustChangePassword: boolean;
};

type LoginInput = {
  username: string;
  password: string;
};

type RegisterUserInput = {
  storeId: string;
  username: string;
  password: string;
  displayName: string;
  email?: string;
};

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  accessToken: string;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { message?: string | string[] };

  if (!response.ok) {
    const message = Array.isArray(payload.message) ? payload.message.join(" ") : payload.message;
    throw new Error(message || "La solicitud no pudo completarse.");
  }

  return payload as T;
}

async function postJson<TResponse>(
  path: string,
  body: unknown,
  accessToken?: string
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify(body)
  });

  return parseJsonResponse<TResponse>(response);
}

async function postEncryptedJson<TResponse>(
  path: string,
  body: object,
  accessToken?: string
): Promise<TResponse> {
  return postJson<TResponse>(path, await encryptAuthPayload(body), accessToken);
}

export const authApi = {
  login(input: LoginInput) {
    return postEncryptedJson<LoginResponse>("/auth/login", input);
  },

  register(input: RegisterUserInput) {
    return postEncryptedJson<RegisterUserResponse>("/auth/register", input);
  },

  changePassword(input: ChangePasswordInput) {
    const { accessToken, ...body } = input;
    return postEncryptedJson<ChangePasswordResponse>("/auth/change-password", body, accessToken);
  }
};
