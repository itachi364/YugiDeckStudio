import { DeckStatus, ReviewStatus } from "@prisma/client";

export const DECK_PERSISTENCE_REPOSITORY = Symbol("DECK_PERSISTENCE_REPOSITORY");

export interface ManagedAssetReference {
  id: string;
  storagePath: string;
  deletedAt: Date | null;
}

export interface DeckReviewSnapshot {
  reviewStatus: ReviewStatus;
}

export interface DeckInactivationSnapshot {
  id: string;
  status: DeckStatus;
  uploadedImageAsset: ManagedAssetReference;
  generatedImageAssets: ManagedAssetReference[];
}

export interface MarkDeckInactiveInput {
  deckId: string;
  inactiveAt: Date;
  inactiveByUserId: string;
  inactivityReason?: string;
  removableAssetIds: string[];
}

export interface MarkDeckInactiveResult {
  id: string;
  status: DeckStatus;
  inactiveByUserId: string | null;
  inactivityReason: string | null;
}

export interface DeckPersistenceRepository {
  findReviewSnapshot(deckId: string): Promise<DeckReviewSnapshot | null>;
  findInactivationSnapshot(deckId: string): Promise<DeckInactivationSnapshot | null>;
  markDeckInactive(input: MarkDeckInactiveInput): Promise<MarkDeckInactiveResult>;
}
