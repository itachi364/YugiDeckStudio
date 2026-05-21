import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ImageAssetCategory, RetentionPolicy } from "@prisma/client";
import { CacheCardImagesUseCase } from "../src/modules/decks/application/cache-card-images.use-case";

describe("CacheCardImagesUseCase", () => {
  const findDeck = jest.fn();
  const upsertImageAsset = jest.fn();
  const updateCard = jest.fn();
  const storeCardImage = jest.fn();

  const useCase = new CacheCardImagesUseCase(
    {
      deck: {
        findUnique: findDeck
      },
      managedImageAsset: {
        upsert: upsertImageAsset
      },
      card: {
        update: updateCard
      }
    } as never,
    {
      storeCardImage
    }
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findDeck.mockResolvedValue({
      id: "deck-id",
      deckCards: [
        {
          card: {
            id: "card-1",
            ygoprodeckId: 89631139,
            officialName: "Blue-Eyes White Dragon",
            imageAssetId: null,
            imageUrlSource: "https://images.ygoprodeck.com/images/cards/89631139.jpg",
            imageAsset: null
          }
        }
      ]
    });
    storeCardImage.mockResolvedValue({
      checksum: "checksum",
      mimeType: "image/jpeg",
      sizeBytes: 123,
      storagePath: "card-images/89631139.jpg"
    });
    upsertImageAsset.mockResolvedValue({
      id: "asset-1",
      storagePath: "card-images/89631139.jpg"
    });
  });

  it("downloads card images, persists permanent assets and links them to cards", async () => {
    const result = await useCase.execute("deck-id");

    expect(storeCardImage).toHaveBeenCalledWith({
      imageUrl: "https://images.ygoprodeck.com/images/cards/89631139.jpg",
      ygoprodeckId: 89631139
    });
    expect(upsertImageAsset).toHaveBeenCalledWith({
      where: {
        storagePath: "card-images/89631139.jpg"
      },
      create: expect.objectContaining({
        category: ImageAssetCategory.CARD_IMAGE,
        storagePath: "card-images/89631139.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 123,
        checksum: "checksum",
        retentionPolicy: RetentionPolicy.PERMANENT
      }),
      update: expect.objectContaining({
        category: ImageAssetCategory.CARD_IMAGE,
        retentionPolicy: RetentionPolicy.PERMANENT,
        deletedAt: null
      }),
      select: {
        id: true,
        storagePath: true
      }
    });
    expect(updateCard).toHaveBeenCalledWith({
      where: {
        id: "card-1"
      },
      data: expect.objectContaining({
        imageAssetId: "asset-1"
      })
    });
    expect(result).toMatchObject({
      deckId: "deck-id",
      cached: [
        {
          cardId: "card-1",
          officialName: "Blue-Eyes White Dragon",
          imageAssetId: "asset-1",
          storagePath: "card-images/89631139.jpg"
        }
      ],
      alreadyCached: [],
      missing: []
    });
  });

  it("does not download cards with active cached image assets", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      deckCards: [
        {
          card: {
            id: "card-1",
            ygoprodeckId: 89631139,
            officialName: "Blue-Eyes White Dragon",
            imageAssetId: "asset-1",
            imageUrlSource: "https://images.ygoprodeck.com/images/cards/89631139.jpg",
            imageAsset: {
              id: "asset-1",
              storagePath: "card-images/89631139.jpg",
              deletedAt: null
            }
          }
        }
      ]
    });

    const result = await useCase.execute("deck-id");

    expect(storeCardImage).not.toHaveBeenCalled();
    expect(result.alreadyCached).toEqual([
      {
        cardId: "card-1",
        officialName: "Blue-Eyes White Dragon",
        imageAssetId: "asset-1",
        storagePath: "card-images/89631139.jpg"
      }
    ]);
  });

  it("reports cards without source image URL as missing", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      deckCards: [
        {
          card: {
            id: "card-1",
            ygoprodeckId: 89631139,
            officialName: "Blue-Eyes White Dragon",
            imageAssetId: null,
            imageUrlSource: null,
            imageAsset: null
          }
        }
      ]
    });

    const result = await useCase.execute("deck-id");

    expect(storeCardImage).not.toHaveBeenCalled();
    expect(result.missing).toEqual([
      {
        cardId: "card-1",
        officialName: "Blue-Eyes White Dragon",
        reason: "La carta no tiene URL de imagen fuente."
      }
    ]);
  });

  it("rejects missing decks", async () => {
    findDeck.mockResolvedValue(null);

    await expect(useCase.execute("missing-deck")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects decks without resolved cards", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      deckCards: []
    });

    await expect(useCase.execute("deck-id")).rejects.toBeInstanceOf(BadRequestException);
  });
});
