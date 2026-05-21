import { ConflictException, ForbiddenException } from "@nestjs/common";
import { DeckStatus } from "@prisma/client";
import { InactivateDeckUseCase } from "../src/modules/decks/application/inactivate-deck.use-case";

describe("InactivateDeckUseCase", () => {
  const findDeck = jest.fn();
  const transaction = jest.fn();
  const updateAssets = jest.fn();
  const updateDeck = jest.fn();
  const removeImage = jest.fn();
  const useCase = new InactivateDeckUseCase(
    {
      deck: {
        findUnique: findDeck
      },
      $transaction: transaction
    } as never,
    {
      remove: removeImage
    } as never
  );

  const storeAdminUser = {
    sub: "admin-id",
    username: "admin",
    storeId: "store-id",
    isRoot: false,
    mustChangePassword: false,
    roles: ["store_admin"]
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
    updateAssets.mockResolvedValue({
      count: 2
    });
    updateDeck.mockResolvedValue({
      id: "deck-id",
      status: DeckStatus.INACTIVE,
      inactiveByUserId: "admin-id",
      inactivityReason: "Correccion solicitada"
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

  it("soft deletes the deck and removes uploaded/generated images for store admins", async () => {
    const result = await useCase.execute({
      deckId: "deck-id",
      user: storeAdminUser,
      reason: " Correccion solicitada "
    });

    expect(updateAssets).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["uploaded-asset-id", "generated-asset-id"]
        }
      },
      data: {
        deletedAt: expect.any(Date)
      }
    });
    expect(updateDeck).toHaveBeenCalledWith({
      where: {
        id: "deck-id"
      },
      data: {
        status: DeckStatus.INACTIVE,
        inactiveAt: expect.any(Date),
        inactiveByUserId: "admin-id",
        inactivityReason: "Correccion solicitada"
      },
      select: {
        id: true,
        status: true,
        inactiveByUserId: true,
        inactivityReason: true
      }
    });
    expect(removeImage).toHaveBeenCalledWith("uploaded-decklists/deck.png");
    expect(removeImage).toHaveBeenCalledWith("generated-deck-images/deck.png");
    expect(result).toEqual({
      deckId: "deck-id",
      status: DeckStatus.INACTIVE,
      inactiveByUserId: "admin-id",
      inactivityReason: "Correccion solicitada",
      removedImageStoragePaths: ["uploaded-decklists/deck.png", "generated-deck-images/deck.png"]
    });
  });

  it("allows root to inactivate decks", async () => {
    await expect(
      useCase.execute({
        deckId: "deck-id",
        user: {
          ...storeAdminUser,
          sub: "root-id",
          storeId: null,
          isRoot: true,
          roles: ["root"]
        }
      })
    ).resolves.toMatchObject({
      status: DeckStatus.INACTIVE
    });
  });

  it("blocks operators from inactivating generated decks", async () => {
    await expect(
      useCase.execute({
        deckId: "deck-id",
        user: {
          ...storeAdminUser,
          sub: "operator-id",
          roles: ["operator"]
        }
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("blocks inactivation before an image is generated", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      status: DeckStatus.REVIEWED,
      uploadedImageAsset: {
        id: "uploaded-asset-id",
        storagePath: "uploaded-decklists/deck.png",
        deletedAt: null
      },
      generatedImages: []
    });

    await expect(
      useCase.execute({
        deckId: "deck-id",
        user: storeAdminUser
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
