export const GENERATED_DECK_IMAGE_WIDTH = 1080;
export const GENERATED_DECK_IMAGE_HEIGHT = 1350;

export const ROOT_DEFAULT_USERNAME = "root";

export const INITIAL_ROLES = {
  root: "root",
  storeAdmin: "store_admin",
  operator: "operator"
} as const;

export type InitialRole = (typeof INITIAL_ROLES)[keyof typeof INITIAL_ROLES];
