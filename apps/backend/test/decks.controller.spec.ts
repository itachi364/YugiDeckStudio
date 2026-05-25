import { BadRequestException } from "@nestjs/common";
import { DeckStatus, ExtractionStatus, ReviewStatus } from "@prisma/client";
import { DecksController } from "../src/modules/decks/decks.controller";

describe("DecksController", () => {
  const uploadDeckListUseCase = {
    execute: jest.fn()
  };
  const storeAccessPolicy = {
    assertCanAccessStore: jest.fn()
  };

  const controller = new DecksController(
    uploadDeckListUseCase as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    storeAccessPolicy as never
  );

  const user = {
    sub: "user-id",
    username: "root",
    storeId: null,
    isRoot: true,
    mustChangePassword: false,
    roles: ["root"]
  };

  const body = {
    storeId: "store-id",
    playerName: "Michael Vanegas",
    tournamentDate: "2026-04-26",
    resultLabel: "Top 4",
    deckName: "White Forest"
  };

  const file = {
    buffer: Buffer.from("image"),
    mimetype: "image/jpeg",
    originalname: "deck.jpg",
    size: 5
  };

  beforeEach(() => {
    jest.clearAllMocks();
    uploadDeckListUseCase.execute.mockResolvedValue({
      deckId: "deck-id",
      playerId: "player-id",
      tournamentId: "tournament-id",
      uploadedImageAssetId: "asset-id",
      status: DeckStatus.UPLOADED,
      extractionStatus: ExtractionStatus.PENDING,
      reviewStatus: ReviewStatus.PENDING
    });
  });

  it("validates store scope after multipart body is available", async () => {
    await controller.uploadDeckList(body, user, file);

    expect(storeAccessPolicy.assertCanAccessStore).toHaveBeenCalledWith(user, "store-id");
    expect(uploadDeckListUseCase.execute).toHaveBeenCalledWith({
      ...body,
      file
    });
  });

  it("rejects upload without file before persisting the deck", async () => {
    expect(() => controller.uploadDeckList(body, user, undefined)).toThrow(BadRequestException);

    expect(storeAccessPolicy.assertCanAccessStore).not.toHaveBeenCalled();
    expect(uploadDeckListUseCase.execute).not.toHaveBeenCalled();
  });
});
