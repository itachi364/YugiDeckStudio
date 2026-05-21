export const AUTH_TOKEN_PORT = Symbol("AUTH_TOKEN_PORT");

export interface AuthenticatedUserPayload {
  sub: string;
  username: string;
  storeId: string | null;
  isRoot: boolean;
  mustChangePassword: boolean;
  roles: string[];
}

export interface SignedAuthToken {
  accessToken: string;
  expiresIn: string;
}

export interface AuthTokenPort {
  sign(payload: AuthenticatedUserPayload): Promise<SignedAuthToken>;
  verify(token: string): Promise<AuthenticatedUserPayload>;
}
