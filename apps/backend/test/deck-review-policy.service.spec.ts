import { ConflictException, NotFoundException } from "@nestjs/common";
import { ReviewStatus } from "@prisma/client";
import { DeckReviewPolicyService } from "../src/modules/decks/application/deck-review-policy.service";

describe("DeckReviewPolicyService", () => {
  const findReviewSnapshot = jest.fn();
  const service = new DeckReviewPolicyService({
    findReviewSnapshot
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows image generation when review is confirmed", async () => {
    findReviewSnapshot.mockResolvedValue({
      reviewStatus: ReviewStatus.CONFIRMED
    });

    await expect(service.assertCanGenerateImage("deck-id")).resolves.toBeUndefined();
  });

  it("blocks image generation when review is pending", async () => {
    findReviewSnapshot.mockResolvedValue({
      reviewStatus: ReviewStatus.PENDING
    });

    await expect(service.assertCanGenerateImage("deck-id")).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects missing deck", async () => {
    findReviewSnapshot.mockResolvedValue(null);

    await expect(service.assertCanGenerateImage("missing-deck")).rejects.toBeInstanceOf(NotFoundException);
  });
});
