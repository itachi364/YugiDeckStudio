import { DeckStatus, ReviewStatus } from "@prisma/client";
import { PostgresDeckPersistenceRepository } from "../src/modules/decks/infrastructure/postgres-deck-persistence.repository";

describe("PostgresDeckPersistenceRepository", () => {
  const findDeck = jest.fn();
  const updateAssets = jest.fn();
  const updateDeck = jest.fn();
  const transaction = jest.fn();
  const repository = new PostgresDeckPersistenceRepository({
    deck: {
      findUnique: findDeck
    },
    $transaction: transaction
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    updateAssets.mockResolvedValue({
      count: 2
    });
    updateDeck.mockResolvedValue({
      id: "deck-id",
      status: DeckStatus.INACTIVE,
      inactiveByUserId: "admin-id",
      inactivityReason: "Correccion"
    });
    transaction.mockImplementation((callback) =>
      callback({
        managedImageAsset: {
          updateMany: updateAssets
        },
        deck: {
          update: updateDeck
        }
      })
    );
  });

  it("reads review snapshots", async () => {
    findDeck.mockResolvedValue({
      reviewStatus: ReviewStatus.CONFIRMED
    });

    await expect(repository.findReviewSnapshot("deck-id")).resolves.toEqual({
      reviewStatus: ReviewStatus.CONFIRMED
    });
    expect(findDeck).toHaveBeenCalledWith({
      where: {
        id: "deck-id"
      },
      select: {
        reviewStatus: true
      }
    });
  });

  it("maps deck inactivation snapshots", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      status: DeckStatus.IMAGE_GENERATED,
      uploadedImageAsset: {
        id: "uploaded-asset-id",
        storagePath: "uploaded-decklists/deck.png",
        deletedAt: null
      },
      generatedImages: [
        {
          imageAsset: {
            id: "generated-asset-id",
            storagePath: "generated-deck-images/deck.png",
            deletedAt: null
          }
        }
      ]
    });

    await expect(repository.findInactivationSnapshot("deck-id")).resolves.toEqual({
      id: "deck-id",
      status: DeckStatus.IMAGE_GENERATED,
      uploadedImageAsset: {
        id: "uploaded-asset-id",
        storagePath: "uploaded-decklists/deck.png",
        deletedAt: null
      },
      generatedImageAssets: [
        {
          id: "generated-asset-id",
          storagePath: "generated-deck-images/deck.png",
          deletedAt: null
        }
      ]
    });
  });

  it("marks deck and temporary image assets as inactive/deleted", async () => {
    const inactiveAt = new Date("2026-05-22T00:00:00.000Z");

    await repository.markDeckInactive({
      deckId: "deck-id",
      inactiveAt,
      inactiveByUserId: "admin-id",
      inactivityReason: "Correccion",
      removableAssetIds: ["uploaded-asset-id", "generated-asset-id"]
    });

    expect(updateAssets).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["uploaded-asset-id", "generated-asset-id"]
        }
      },
      data: {
        deletedAt: inactiveAt
      }
    });
    expect(updateDeck).toHaveBeenCalledWith({
      where: {
        id: "deck-id"
      },
      data: {
        status: DeckStatus.INACTIVE,
        inactiveAt,
        inactiveByUserId: "admin-id",
        inactivityReason: "Correccion"
      },
      select: {
        id: true,
        status: true,
        inactiveByUserId: true,
        inactivityReason: true
      }
    });
  });
});
