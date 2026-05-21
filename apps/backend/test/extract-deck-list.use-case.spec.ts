import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { DeckStatus, ExtractionStatus, ResolutionStatus } from "@prisma/client";
import { ExtractDeckListFromImageUseCase } from "../src/modules/decks/application/extract-deck-list.use-case";
import { DeckListParser } from "../src/modules/decks/domain/deck-list-parser";

describe("ExtractDeckListFromImageUseCase", () => {
  const findDeck = jest.fn();
  const updateDeck = jest.fn();
  const createManyDeckCards = jest.fn();
  const transaction = jest.fn();
  const resolveStoragePath = jest.fn();
  const extractTextFromImage = jest.fn();

  const useCase = new ExtractDeckListFromImageUseCase(
    {
      deck: {
        findUnique: findDeck,
        update: updateDeck
      },
      deckCard: {
        createMany: createManyDeckCards
      },
      $transaction: transaction
    } as never,
    {
      resolveStoragePath
    } as never,
    new DeckListParser(),
    {
      extractTextFromImage
    }
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findDeck.mockResolvedValue({
      id: "deck-id",
      uploadedImageAsset: {
        storagePath: "uploaded-decklists/deck.png",
        deletedAt: null
      },
      deckCards: []
    });
    resolveStoragePath.mockReturnValue("/data/images/uploaded-decklists/deck.png");
    extractTextFromImage.mockResolvedValue(`
      Main Deck
      3 Silvy del Bosque Blanco
      Extra Deck
      1 Diabell, Reina del Bosque Blanco
    `);
    updateDeck.mockReturnValue("update-operation");
    createManyDeckCards.mockReturnValue("create-many-operation");
    transaction.mockResolvedValue(["deck", { count: 2 }]);
  });

  it("extracts OCR text, persists parsed cards and updates deck status", async () => {
    const result = await useCase.execute("deck-id");

    expect(resolveStoragePath).toHaveBeenCalledWith("uploaded-decklists/deck.png");
    expect(extractTextFromImage).toHaveBeenCalledWith("/data/images/uploaded-decklists/deck.png");
    expect(updateDeck).toHaveBeenCalledWith({
      where: {
        id: "deck-id"
      },
      data: {
        rawOcrText: expect.stringContaining("Silvy"),
        extractionStatus: ExtractionStatus.EXTRACTED,
        status: DeckStatus.EXTRACTED
      }
    });
    expect(createManyDeckCards).toHaveBeenCalledWith({
      data: [
        {
          deckId: "deck-id",
          section: "MAIN",
          quantity: 3,
          originalName: "Silvy del Bosque Blanco",
          displayOrder: 1,
          resolutionStatus: ResolutionStatus.UNRESOLVED
        },
        {
          deckId: "deck-id",
          section: "EXTRA",
          quantity: 1,
          originalName: "Diabell, Reina del Bosque Blanco",
          displayOrder: 1,
          resolutionStatus: ResolutionStatus.UNRESOLVED
        }
      ]
    });
    expect(transaction).toHaveBeenCalledWith(["update-operation", "create-many-operation"]);
    expect(result.status).toBe(DeckStatus.EXTRACTED);
    expect(result.cards).toHaveLength(2);
  });

  it("rejects extraction when the deck does not exist", async () => {
    findDeck.mockResolvedValue(null);

    await expect(useCase.execute("missing-deck")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects extraction when cards already exist", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      uploadedImageAsset: {
        storagePath: "uploaded-decklists/deck.png",
        deletedAt: null
      },
      deckCards: [{ id: "card-id" }]
    });

    await expect(useCase.execute("deck-id")).rejects.toBeInstanceOf(ConflictException);
  });

  it("marks extraction as failed when OCR returns no cards", async () => {
    extractTextFromImage.mockResolvedValue("Texto sin cartas");

    await expect(useCase.execute("deck-id")).rejects.toBeInstanceOf(BadRequestException);
    expect(updateDeck).toHaveBeenCalledWith({
      where: {
        id: "deck-id"
      },
      data: {
        rawOcrText: "Texto sin cartas",
        extractionStatus: ExtractionStatus.FAILED
      }
    });
  });
});
