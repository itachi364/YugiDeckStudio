export const CARD_IMAGE_STORAGE_PORT = Symbol("CARD_IMAGE_STORAGE_PORT");

export interface StoreCardImageInput {
  imageUrl: string;
  ygoprodeckId: number;
}

export interface StoredCardImage {
  checksum: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}

export interface CardImageStoragePort {
  storeCardImage(input: StoreCardImageInput): Promise<StoredCardImage>;
}
