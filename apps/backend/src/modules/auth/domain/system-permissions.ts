export const SYSTEM_PERMISSIONS = {
  SECURITY_MANAGE: "security.manage",
  STORE_CONFIG_MANAGE: "store.config.manage",
  DECKS_OPERATE: "decks.operate",
  DECKS_ADMIN: "decks.admin"
} as const;

export type SystemPermission = (typeof SYSTEM_PERMISSIONS)[keyof typeof SYSTEM_PERMISSIONS];
