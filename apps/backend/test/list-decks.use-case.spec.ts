import { ForbiddenException } from "@nestjs/common";
import { DeckStatus, ExtractionStatus, ReviewStatus, TournamentStatus } from "@prisma/client";
import { ListDecksUseCase } from "../src/modules/decks/application/list-decks.use-case";

describe("ListDecksUseCase", () => {
  const findMany = jest.fn();
  const useCase = new ListDecksUseCase({
    deck: {
      findMany
    }
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([
      {
        id: "deck-id",
        storeId: "store-id",
        deckName: "White Forest",
        resultLabel: "Top 4",
        status: DeckStatus.EXTRACTED,
        extractionStatus: ExtractionStatus.EXTRACTED,
        reviewStatus: ReviewStatus.PENDING,
        createdAt: new Date("2026-05-26T00:00:00.000Z"),
        player: {
          displayName: "Michael"
        },
        store: {
          name: "Ready For Duel"
        },
        tournament: {
          id: "tournament-id",
          name: "Torneo Mes de Abril",
          status: TournamentStatus.OPEN,
          eventDate: new Date("2026-05-25T00:00:00.000Z")
        },
        deckCards: [{ quantity: 3 }, { quantity: 2 }]
      }
    ]);
  });

  it("lists every active deck for root users", async () => {
    const result = await useCase.execute({
      sub: "root-id",
      username: "root",
      storeId: null,
      isRoot: true,
      mustChangePassword: false,
      roles: ["root"]
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: {
            not: DeckStatus.INACTIVE
          }
        }
      })
    );
    expect(result[0]).toEqual(
      expect.objectContaining({
        deckId: "deck-id",
        storeName: "Ready For Duel",
        playerName: "Michael",
        tournamentId: "tournament-id",
        tournamentName: "Torneo Mes de Abril",
        tournamentStatus: TournamentStatus.OPEN,
        cardCount: 5
      })
    );
  });

  it("filters decks by store for non-root users", async () => {
    await useCase.execute({
      sub: "operator-id",
      username: "operator",
      storeId: "store-id",
      isRoot: false,
      mustChangePassword: false,
      roles: ["operator"]
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storeId: "store-id",
          status: {
            not: DeckStatus.INACTIVE
          }
        }
      })
    );
  });

  it("rejects non-root users without store scope", async () => {
    await expect(
      useCase.execute({
        sub: "operator-id",
        username: "operator",
        storeId: null,
        isRoot: false,
        mustChangePassword: false,
        roles: ["operator"]
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
