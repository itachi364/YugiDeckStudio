import { BadRequestException } from "@nestjs/common";
import { DeckSection, DeckStatus, ImageAssetCategory, RetentionPolicy } from "@prisma/client";
import { GenerateDeckImageUseCase } from "../src/modules/decks/application/generate-deck-image.use-case";

describe("GenerateDeckImageUseCase", () => {
  const findDeck = jest.fn();
  const transaction = jest.fn();
  const createImageAsset = jest.fn();
  const createGeneratedDeckImage = jest.fn();
  const updateDeck = jest.fn();
  const resolveStoragePath = jest.fn((storagePath: string) => `C:\\images\\${storagePath}`);
  const saveGeneratedDeckImage = jest.fn();
  const assertCanGenerateImage = jest.fn();
  const render = jest.fn();

  const useCase = new GenerateDeckImageUseCase(
    {
      deck: {
        findUnique: findDeck
      },
      $transaction: transaction
    } as never,
    {
      resolveStoragePath,
      saveGeneratedDeckImage
    } as never,
    {
      assertCanGenerateImage
    } as never,
    {
      render
    }
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findDeck.mockResolvedValue({
      id: "deck-id",
      deckName: "Blue-Eyes",
      resultLabel: "Top 8",
      player: {
        displayName: "Kaiba"
      },
      tournament: {
        name: "Local WCQ",
        eventDate: new Date("2026-05-01T00:00:00.000Z"),
        eventType: {
          name: "Regional",
          logoAsset: null
        },
        tournamentType: null
      },
      store: {
        backgroundColor: "#111827",
        sourceCreditText: "ReadyForDuel",
        primaryLogoAsset: null,
        secondaryLogoAsset: null,
        backgroundImageAsset: null,
        socialLinks: []
      },
      deckCards: [
        {
          id: "deck-card-1",
          section: DeckSection.MAIN,
          quantity: 3,
          originalName: "Blue Eyes White Dragon",
          displayOrder: 1,
          card: {
            officialName: "Blue-Eyes White Dragon",
            imageAsset: {
              storagePath: "card-images/89631139.jpg",
              deletedAt: null
            }
          }
        }
      ]
    });
    render.mockResolvedValue({
      buffer: Buffer.from("png"),
      width: 1080,
      height: 1350,
      mimeType: "image/png"
    });
    saveGeneratedDeckImage.mockResolvedValue({
      checksum: "checksum",
      mimeType: "image/png",
      sizeBytes: 3,
      storagePath: "generated-deck-images/generated.png"
    });
    createImageAsset.mockResolvedValue({
      id: "asset-1",
      storagePath: "generated-deck-images/generated.png"
    });
    createGeneratedDeckImage.mockResolvedValue({
      id: "generated-image-1"
    });
    updateDeck.mockResolvedValue({
      status: DeckStatus.IMAGE_GENERATED
    });
    transaction.mockImplementation((callback) =>
      callback({
        managedImageAsset: {
          create: createImageAsset
        },
        generatedDeckImage: {
          create: createGeneratedDeckImage
        },
        deck: {
          update: updateDeck
        }
      })
    );
  });

  it("renders and persists generated deck images", async () => {
    const result = await useCase.execute("deck-id");

    expect(assertCanGenerateImage).toHaveBeenCalledWith("deck-id");
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        playerName: "Kaiba",
        resultLabel: "Top 8",
        deckName: "Blue-Eyes",
        backgroundColor: "#111827",
        cards: [
          {
            section: DeckSection.MAIN,
            quantity: 3,
            name: "Blue-Eyes White Dragon",
            imagePath: "C:\\images\\card-images/89631139.jpg",
            displayOrder: 1
          }
        ]
      })
    );
    expect(saveGeneratedDeckImage).toHaveBeenCalledWith(Buffer.from("png"));
    expect(createImageAsset).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: ImageAssetCategory.GENERATED_DECK_IMAGE,
        storagePath: "generated-deck-images/generated.png",
        mimeType: "image/png",
        sizeBytes: 3,
        checksum: "checksum",
        width: 1080,
        height: 1350,
        retentionPolicy: RetentionPolicy.TEMPORARY_CLEANUP_ALLOWED
      }),
      select: {
        id: true,
        storagePath: true
      }
    });
    expect(createGeneratedDeckImage).toHaveBeenCalledWith({
      data: {
        deckId: "deck-id",
        imageAssetId: "asset-1",
        templateName: "base-v0.1.0",
        width: 1080,
        height: 1350
      },
      select: {
        id: true
      }
    });
    expect(updateDeck).toHaveBeenCalledWith({
      where: {
        id: "deck-id"
      },
      data: {
        status: DeckStatus.IMAGE_GENERATED
      },
      select: {
        status: true
      }
    });
    expect(result).toEqual({
      deckId: "deck-id",
      generatedImageId: "generated-image-1",
      imageAssetId: "asset-1",
      storagePath: "generated-deck-images/generated.png",
      width: 1080,
      height: 1350,
      mimeType: "image/png",
      status: DeckStatus.IMAGE_GENERATED
    });
  });

  it("blocks generation when a deck card is unresolved", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      deckCards: [
        {
          id: "deck-card-1",
          originalName: "Unknown Card",
          card: null
        }
      ]
    });

    await expect(useCase.execute("deck-id")).rejects.toBeInstanceOf(BadRequestException);
    expect(render).not.toHaveBeenCalled();
  });

  it("blocks generation when a card image is not cached", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      deckCards: [
        {
          id: "deck-card-1",
          originalName: "Blue Eyes White Dragon",
          card: {
            officialName: "Blue-Eyes White Dragon",
            imageAsset: null
          }
        }
      ]
    });

    await expect(useCase.execute("deck-id")).rejects.toBeInstanceOf(BadRequestException);
    expect(render).not.toHaveBeenCalled();
  });
});
