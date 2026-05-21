export const SYSTEM_ROLES = {
  ROOT: "root",
  STORE_ADMIN: "store_admin",
  OPERATOR: "operator"
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
