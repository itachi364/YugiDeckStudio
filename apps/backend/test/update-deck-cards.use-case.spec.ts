import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { DeckSection, ExtractionStatus, ResolutionStatus, ReviewStatus } from "@prisma/client";
import { UpdateDeckCardsUseCase } from "../src/modules/decks/application/update-deck-cards.use-case";

describe("UpdateDeckCardsUseCase", () => {
  const findDeck = jest.fn();
  const deleteManyDeckCards = jest.fn();
  const createManyDeckCards = jest.fn();
  const updateDeck = jest.fn();
  const transaction = jest.fn();

  const useCase = new UpdateDeckCardsUseCase({
    deck: {
      findUnique: findDeck,
      update: updateDeck
    },
    deckCard: {
      deleteMany: deleteManyDeckCards,
      createMany: createManyDeckCards
    },
    $transaction: transaction
  } as never);

  const cards = [
    {
      section: DeckSection.MAIN,
      quantity: 3,
      originalName: " Silvy del Bosque Blanco ",
      displayOrder: 1
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    findDeck.mockResolvedValue({
      id: "deck-id",
      extractionStatus: ExtractionStatus.EXTRACTED,
      reviewStatus: ReviewStatus.PENDING
    });
    deleteManyDeckCards.mockReturnValue("delete-operation");
    createManyDeckCards.mockReturnValue("create-many-operation");
    updateDeck.mockReturnValue("update-operation");
    transaction.mockResolvedValue([]);
  });

  it("replaces extracted cards with corrected cards", async () => {
    const result = await useCase.execute({
      deckId: "deck-id",
      cards
    });

    expect(deleteManyDeckCards).toHaveBeenCalledWith({
      where: {
        deckId: "deck-id"
      }
    });
    expect(createManyDeckCards).toHaveBeenCalledWith({
      data: [
        {
          deckId: "deck-id",
          section: DeckSection.MAIN,
          quantity: 3,
          originalName: "Silvy del Bosque Blanco",
          displayOrder: 1,
          resolutionStatus: ResolutionStatus.UNRESOLVED
        }
      ]
    });
    expect(transaction).toHaveBeenCalledWith(["delete-operation", "create-many-operation", "update-operation"]);
    expect(result.cards[0].originalName).toBe("Silvy del Bosque Blanco");
  });

  it("rejects correction before Neuron import", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      extractionStatus: ExtractionStatus.PENDING,
      reviewStatus: ReviewStatus.PENDING
    });

    await expect(useCase.execute({ deckId: "deck-id", cards })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects correction after review confirmation", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      extractionStatus: ExtractionStatus.EXTRACTED,
      reviewStatus: ReviewStatus.CONFIRMED
    });

    await expect(useCase.execute({ deckId: "deck-id", cards })).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects missing deck", async () => {
    findDeck.mockResolvedValue(null);

    await expect(useCase.execute({ deckId: "missing-deck", cards })).rejects.toBeInstanceOf(NotFoundException);
  });
});
