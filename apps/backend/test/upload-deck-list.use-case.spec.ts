import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  DeckStatus,
  ExtractionStatus,
  ImageAssetCategory,
  RetentionPolicy,
  ReviewStatus
} from "@prisma/client";
import { UploadDeckListUseCase } from "../src/modules/decks/application/upload-deck-list.use-case";

describe("UploadDeckListUseCase", () => {
  const findStore = jest.fn();
  const findDeck = jest.fn();
  const transaction = jest.fn();
  const saveUploadedDeckList = jest.fn();
  const removeStoredFile = jest.fn();
  const importDeck = jest.fn();

  const useCase = new UploadDeckListUseCase(
    {
      store: {
        findUnique: findStore
      },
      deck: {
        findUnique: findDeck
      },
      $transaction: transaction
    } as never,
    {
      saveUploadedDeckList,
      remove: removeStoredFile
    } as never,
    {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          UPLOADED_DECKLIST_MAX_BYTES: "10485760"
        };

        return values[key];
      })
    } as never,
    {
      importDeck
    } as never
  );

  const validInput = {
    storeId: "7fd4fd87-4e90-4c13-b47f-a0145f123d17",
    playerName: "Kaihuang Zhang",
    tournamentDate: "2026-05-21",
    resultLabel: "Top 8",
    deckName: "White Forest",
    neuronDeckUrl: "https://neuron.konami.net/link/6omm271xgfka1d95",
    tournamentName: "Regional",
    location: "Las Vegas",
    file: {
      buffer: Buffer.from("image"),
      mimetype: "image/png",
      originalname: "deck.png",
      size: 5
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findStore.mockResolvedValue({ id: validInput.storeId });
    saveUploadedDeckList.mockResolvedValue({
      checksum: "checksum",
      storagePath: "uploaded-decklists/deck.png"
    });
    importDeck.mockResolvedValue({
      sourceUrl: "https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=id&dno=14",
      cards: [
        {
          section: "MAIN",
          quantity: 3,
          originalName: "Silvy of the White Forest",
          displayOrder: 1
        },
        {
          section: "EXTRA",
          quantity: 1,
          originalName: "Diabell, Queen of the White Forest",
          displayOrder: 1
        }
      ]
    });
    removeStoredFile.mockResolvedValue(undefined);
    transaction.mockImplementation(async (callback) =>
      callback({
        managedImageAsset: {
          create: jest.fn().mockResolvedValue({ id: "asset-id" })
        },
        player: {
          create: jest.fn().mockResolvedValue({ id: "player-id" })
        },
        tournament: {
          create: jest.fn().mockResolvedValue({ id: "tournament-id" })
        },
        deck: {
          create: jest.fn().mockResolvedValue({
            id: "deck-id",
            playerId: "player-id",
            tournamentId: "tournament-id",
            uploadedImageAssetId: "asset-id",
            status: DeckStatus.EXTRACTED,
            extractionStatus: ExtractionStatus.EXTRACTED,
            reviewStatus: ReviewStatus.PENDING
          })
        },
        deckCard: {
          createMany: jest.fn().mockResolvedValue({ count: 2 })
        }
      })
    );
  });

  it("rejects missing required metadata", async () => {
    await expect(
      useCase.execute({
        ...validInput,
        playerName: ""
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(saveUploadedDeckList).not.toHaveBeenCalled();
  });

  it("rejects missing Neuron link before saving the image", async () => {
    await expect(
      useCase.execute({
        ...validInput,
        neuronDeckUrl: ""
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(importDeck).not.toHaveBeenCalled();
    expect(saveUploadedDeckList).not.toHaveBeenCalled();
  });

  it("rejects unsupported file mime types", async () => {
    await expect(
      useCase.execute({
        ...validInput,
        file: {
          ...validInput.file,
          mimetype: "application/pdf"
        }
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(saveUploadedDeckList).not.toHaveBeenCalled();
  });

  it("persists the uploaded deck list metadata and initial deck state", async () => {
    const result = await useCase.execute(validInput);

    expect(importDeck).toHaveBeenCalledWith(validInput.neuronDeckUrl);
    expect(saveUploadedDeckList).toHaveBeenCalledWith(validInput.file);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      deckId: "deck-id",
      playerId: "player-id",
      tournamentId: "tournament-id",
      uploadedImageAssetId: "asset-id",
      status: DeckStatus.EXTRACTED,
      extractionStatus: ExtractionStatus.EXTRACTED,
      reviewStatus: ReviewStatus.PENDING,
      importedCardCount: 2
    });
  });

  it("creates the image asset as a temporary uploaded decklist", async () => {
    const managedImageAssetCreate = jest.fn().mockResolvedValue({ id: "asset-id" });

    transaction.mockImplementation(async (callback) =>
      callback({
        managedImageAsset: {
          create: managedImageAssetCreate
        },
        player: {
          create: jest.fn().mockResolvedValue({ id: "player-id" })
        },
        tournament: {
          create: jest.fn().mockResolvedValue({ id: "tournament-id" })
        },
        deck: {
          create: jest.fn().mockResolvedValue({
            id: "deck-id",
            playerId: "player-id",
            tournamentId: "tournament-id",
            uploadedImageAssetId: "asset-id",
            status: DeckStatus.EXTRACTED,
            extractionStatus: ExtractionStatus.EXTRACTED,
            reviewStatus: ReviewStatus.PENDING
          })
        },
        deckCard: {
          createMany: jest.fn().mockResolvedValue({ count: 2 })
        }
      })
    );

    await useCase.execute(validInput);

    expect(managedImageAssetCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: ImageAssetCategory.UPLOADED_DECKLIST,
        retentionPolicy: RetentionPolicy.TEMPORARY_CLEANUP_ALLOWED,
        mimeType: "image/png",
        sizeBytes: 5,
        checksum: "checksum"
      })
    });
  });

  it("rejects replacing an already uploaded deck list", async () => {
    findDeck.mockResolvedValue({
      uploadedImageAssetId: "asset-id"
    });

    await expect(useCase.assertDeckListCanBeUploaded("deck-id")).rejects.toBeInstanceOf(ConflictException);
  });
});
