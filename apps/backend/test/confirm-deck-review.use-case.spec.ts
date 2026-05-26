import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { DeckSection, DeckStatus, ExtractionStatus, ReviewStatus } from "@prisma/client";
import { DeckCompositionPolicyService } from "../src/modules/decks/application/deck-composition-policy.service";
import { ConfirmDeckReviewUseCase } from "../src/modules/decks/application/confirm-deck-review.use-case";

describe("ConfirmDeckReviewUseCase", () => {
  const findDeck = jest.fn();
  const updateDeck = jest.fn();
  const compositionPolicy = new DeckCompositionPolicyService();
  const useCase = new ConfirmDeckReviewUseCase(
    {
      deck: {
        findUnique: findDeck,
        update: updateDeck
      }
    } as never,
    compositionPolicy
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findDeck.mockResolvedValue({
      id: "deck-id",
      extractionStatus: ExtractionStatus.EXTRACTED,
      reviewStatus: ReviewStatus.PENDING,
      deckCards: buildResolvedMainDeck(40)
    });
    updateDeck.mockResolvedValue({
      id: "deck-id",
      status: DeckStatus.REVIEWED,
      reviewStatus: ReviewStatus.CONFIRMED
    });
  });

  it("confirms review when imported cards were reviewed and composition is valid", async () => {
    const result = await useCase.execute("deck-id");

    expect(updateDeck).toHaveBeenCalledWith({
      where: {
        id: "deck-id"
      },
      data: {
        reviewStatus: ReviewStatus.CONFIRMED,
        status: DeckStatus.REVIEWED
      },
      select: {
        id: true,
        status: true,
        reviewStatus: true
      }
    });
    expect(result).toEqual({
      deckId: "deck-id",
      status: DeckStatus.REVIEWED,
      reviewStatus: ReviewStatus.CONFIRMED,
      cardCount: 40
    });
  });

  it("rejects confirmation before Neuron import", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      extractionStatus: ExtractionStatus.PENDING,
      reviewStatus: ReviewStatus.PENDING,
      deckCards: []
    });

    await expect(useCase.execute("deck-id")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects confirmation when there are no cards", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      extractionStatus: ExtractionStatus.EXTRACTED,
      reviewStatus: ReviewStatus.PENDING,
      deckCards: []
    });

    await expect(useCase.execute("deck-id")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects duplicated confirmation", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      extractionStatus: ExtractionStatus.EXTRACTED,
      reviewStatus: ReviewStatus.CONFIRMED,
      deckCards: buildResolvedMainDeck(40)
    });

    await expect(useCase.execute("deck-id")).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects confirmation when deck composition is incomplete", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      extractionStatus: ExtractionStatus.EXTRACTED,
      reviewStatus: ReviewStatus.PENDING,
      deckCards: buildResolvedMainDeck(3)
    });

    await expect(useCase.execute("deck-id")).rejects.toBeInstanceOf(BadRequestException);
    expect(updateDeck).not.toHaveBeenCalled();
  });

  it("rejects missing deck", async () => {
    findDeck.mockResolvedValue(null);

    await expect(useCase.execute("missing-deck")).rejects.toBeInstanceOf(NotFoundException);
  });
});

function buildResolvedMainDeck(count: number): Array<{
  id: string;
  section: DeckSection;
  quantity: number;
  originalName: string;
}> {
  return Array.from({ length: count }, (_, index) => ({
    id: `deck-card-${index + 1}`,
    section: DeckSection.MAIN,
    quantity: 1,
    originalName: `Card ${index + 1}`
  }));
}
