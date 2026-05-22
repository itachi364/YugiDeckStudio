import { ConflictException, ForbiddenException } from "@nestjs/common";
import { DeckStatus } from "@prisma/client";
import { InactivateDeckUseCase } from "../src/modules/decks/application/inactivate-deck.use-case";

describe("InactivateDeckUseCase", () => {
  const findInactivationSnapshot = jest.fn();
  const markDeckInactive = jest.fn();
  const removeImage = jest.fn();
  const useCase = new InactivateDeckUseCase(
    {
      findInactivationSnapshot,
      markDeckInactive
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
    findInactivationSnapshot.mockResolvedValue({
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
    markDeckInactive.mockResolvedValue({
      id: "deck-id",
      status: DeckStatus.INACTIVE,
      inactiveByUserId: "admin-id",
      inactivityReason: "Correccion solicitada"
    });
  });

  it("soft deletes the deck and removes uploaded/generated images for store admins", async () => {
    const result = await useCase.execute({
      deckId: "deck-id",
      user: storeAdminUser,
      reason: " Correccion solicitada "
    });

    expect(markDeckInactive).toHaveBeenCalledWith({
      deckId: "deck-id",
      inactiveAt: expect.any(Date),
      inactiveByUserId: "admin-id",
      inactivityReason: "Correccion solicitada",
      removableAssetIds: ["uploaded-asset-id", "generated-asset-id"]
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
    findInactivationSnapshot.mockResolvedValue({
      id: "deck-id",
      status: DeckStatus.REVIEWED,
      uploadedImageAsset: {
        id: "uploaded-asset-id",
        storagePath: "uploaded-decklists/deck.png",
        deletedAt: null
      },
      generatedImageAssets: []
    });

    await expect(
      useCase.execute({
        deckId: "deck-id",
        user: storeAdminUser
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
