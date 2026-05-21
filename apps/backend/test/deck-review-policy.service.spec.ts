import { ConflictException, NotFoundException } from "@nestjs/common";
import { ReviewStatus } from "@prisma/client";
import { DeckReviewPolicyService } from "../src/modules/decks/application/deck-review-policy.service";

describe("DeckReviewPolicyService", () => {
  const findDeck = jest.fn();
  const service = new DeckReviewPolicyService({
    deck: {
      findUnique: findDeck
    }
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows image generation when review is confirmed", async () => {
    findDeck.mockResolvedValue({
      reviewStatus: ReviewStatus.CONFIRMED
    });

    await expect(service.assertCanGenerateImage("deck-id")).resolves.toBeUndefined();
  });

  it("blocks image generation when review is pending", async () => {
    findDeck.mockResolvedValue({
      reviewStatus: ReviewStatus.PENDING
    });

    await expect(service.assertCanGenerateImage("deck-id")).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects missing deck", async () => {
    findDeck.mockResolvedValue(null);

    await expect(service.assertCanGenerateImage("missing-deck")).rejects.toBeInstanceOf(NotFoundException);
  });
});
