const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export type SecurityUser = {
  id: string;
  username: string;
  email?: string | null;
  displayName: string;
  storeId: string | null;
  isRoot: boolean;
  mustChangePassword: boolean;
  isActive: boolean;
  store?: {
    id: string;
    name: string;
  } | null;
  userRoles: Array<{
    role: SecurityRole;
  }>;
};

export type SecurityRole = {
  id: string;
  name: string;
  description?: string | null;
  isSystemRole: boolean;
  rolePermissions?: Array<{
    permission: SecurityPermission;
  }>;
};

export type SecurityPermission = {
  id: string;
  code: string;
  description?: string | null;
};

export type CreateStoreAdminInput = {
  storeId?: string;
  storeName?: string;
  username: string;
  password: string;
  displayName: string;
  email?: string;
};

export type CreateRoleInput = {
  name: string;
  description?: string;
  isSystemRole: boolean;
};

export type CreatePermissionInput = {
  code: string;
  description?: string;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { message?: string | string[] };

  if (!response.ok) {
    const message = Array.isArray(payload.message) ? payload.message.join(" ") : payload.message;
    throw new Error(message || "La solicitud no pudo completarse.");
  }

  return payload as T;
}

async function requestJson<TResponse>(
  path: string,
  accessToken: string,
  options?: RequestInit
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers
    }
  });

  return parseJsonResponse<TResponse>(response);
}

export const securityApi = {
  listUsers(accessToken: string) {
    return requestJson<SecurityUser[]>("/auth/users", accessToken);
  },

  listRoles(accessToken: string) {
    return requestJson<SecurityRole[]>("/auth/roles", accessToken);
  },

  listPermissions(accessToken: string) {
    return requestJson<SecurityPermission[]>("/auth/permissions", accessToken);
  },

  createStoreAdmin(accessToken: string, input: CreateStoreAdminInput) {
    return requestJson<{ storeId: string; storeName: string; adminUserId: string; username: string; roles: string[] }>(
      "/auth/root/store-admin",
      accessToken,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );
  },

  createRole(accessToken: string, input: CreateRoleInput) {
    return requestJson<SecurityRole>("/auth/roles", accessToken, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  createPermission(accessToken: string, input: CreatePermissionInput) {
    return requestJson<SecurityPermission>("/auth/permissions", accessToken, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  assignPermissionsToRole(accessToken: string, roleId: string, permissionIds: string[]) {
    return requestJson<SecurityRole>(`/auth/roles/${roleId}/permissions`, accessToken, {
      method: "PUT",
      body: JSON.stringify({ permissionIds })
    });
  },

  assignRolesToUser(accessToken: string, userId: string, roleIds: string[]) {
    return requestJson<SecurityUser>(`/auth/users/${userId}/roles`, accessToken, {
      method: "PUT",
      body: JSON.stringify({ roleIds })
    });
  }
};
