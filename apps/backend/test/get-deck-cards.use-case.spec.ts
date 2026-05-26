import { NotFoundException } from "@nestjs/common";
import { DeckSection, DeckStatus, ExtractionStatus, ReviewStatus } from "@prisma/client";
import { GetDeckCardsUseCase } from "../src/modules/decks/application/get-deck-cards.use-case";

describe("GetDeckCardsUseCase", () => {
  const findDeck = jest.fn();
  const useCase = new GetDeckCardsUseCase({
    deck: {
      findUnique: findDeck
    }
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns persisted review status with imported deck cards", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      status: DeckStatus.REVIEWED,
      extractionStatus: ExtractionStatus.EXTRACTED,
      reviewStatus: ReviewStatus.CONFIRMED,
      deckCards: [
        {
          section: DeckSection.MAIN,
          quantity: 1,
          originalName: "Called by the Grave",
          displayOrder: 2
        },
        {
          section: DeckSection.MAIN,
          quantity: 3,
          originalName: "Silvy of the White Forest",
          displayOrder: 1
        }
      ]
    });

    await expect(useCase.execute("deck-id")).resolves.toEqual({
      deckId: "deck-id",
      status: DeckStatus.REVIEWED,
      extractionStatus: ExtractionStatus.EXTRACTED,
      reviewStatus: ReviewStatus.CONFIRMED,
      source: "NEURON",
      cards: [
        {
          section: DeckSection.MAIN,
          quantity: 3,
          originalName: "Silvy of the White Forest",
          displayOrder: 1
        },
        {
          section: DeckSection.MAIN,
          quantity: 1,
          originalName: "Called by the Grave",
          displayOrder: 2
        }
      ]
    });
  });

  it("rejects missing decks", async () => {
    findDeck.mockResolvedValue(null);

    await expect(useCase.execute("missing-deck")).rejects.toBeInstanceOf(NotFoundException);
  });
});
