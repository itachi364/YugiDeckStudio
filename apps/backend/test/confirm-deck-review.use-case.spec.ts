import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { DeckStatus, ExtractionStatus, ReviewStatus } from "@prisma/client";
import { ConfirmDeckReviewUseCase } from "../src/modules/decks/application/confirm-deck-review.use-case";

describe("ConfirmDeckReviewUseCase", () => {
  const findDeck = jest.fn();
  const updateDeck = jest.fn();
  const useCase = new ConfirmDeckReviewUseCase({
    deck: {
      findUnique: findDeck,
      update: updateDeck
    }
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    findDeck.mockResolvedValue({
      id: "deck-id",
      extractionStatus: ExtractionStatus.EXTRACTED,
      reviewStatus: ReviewStatus.PENDING,
      deckCards: [{ id: "card-id" }]
    });
    updateDeck.mockResolvedValue({
      id: "deck-id",
      status: DeckStatus.REVIEWED,
      reviewStatus: ReviewStatus.CONFIRMED
    });
  });

  it("confirms review when OCR cards exist", async () => {
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
      cardCount: 1
    });
  });

  it("rejects confirmation before OCR extraction", async () => {
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
      deckCards: [{ id: "card-id" }]
    });

    await expect(useCase.execute("deck-id")).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects missing deck", async () => {
    findDeck.mockResolvedValue(null);

    await expect(useCase.execute("missing-deck")).rejects.toBeInstanceOf(NotFoundException);
  });
});
