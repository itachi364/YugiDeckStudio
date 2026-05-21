import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ResolutionStatus } from "@prisma/client";
import { ResolveCardNamesUseCase } from "../src/modules/decks/application/resolve-card-names.use-case";

describe("ResolveCardNamesUseCase", () => {
  const findDeck = jest.fn();
  const updateDeckCard = jest.fn();
  const transaction = jest.fn();
  const findCandidates = jest.fn();

  const useCase = new ResolveCardNamesUseCase(
    {
      deck: {
        findUnique: findDeck
      },
      deckCard: {
        update: updateDeckCard
      },
      $transaction: transaction
    } as never,
    {
      findCandidates
    }
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findDeck.mockResolvedValue({
      id: "deck-id",
      deckCards: [
        {
          id: "deck-card-1",
          originalName: "Blue Eyes White Dragon"
        },
        {
          id: "deck-card-2",
          originalName: "Ambiguous Card"
        },
        {
          id: "deck-card-3",
          originalName: "Unknown Card"
        }
      ]
    });
    findCandidates.mockImplementation((name: string) => {
      const candidates: Record<string, Array<{ id: string; officialName: string }>> = {
        "Blue Eyes White Dragon": [
          {
            id: "card-1",
            officialName: "Blue-Eyes White Dragon"
          }
        ],
        "Ambiguous Card": [
          {
            id: "card-2",
            officialName: "Ambiguous Card"
          },
          {
            id: "card-3",
            officialName: "Ambiguous Card"
          }
        ],
        "Unknown Card": []
      };

      return Promise.resolve(candidates[name]);
    });
    updateDeckCard.mockReturnValue("update-operation");
    transaction.mockResolvedValue([]);
  });

  it("persists resolved, ambiguous and unresolved card names", async () => {
    const result = await useCase.execute("deck-id");

    expect(updateDeckCard).toHaveBeenCalledTimes(3);
    expect(updateDeckCard).toHaveBeenNthCalledWith(1, {
      where: {
        id: "deck-card-1"
      },
      data: {
        cardId: "card-1",
        resolvedEnglishName: "Blue-Eyes White Dragon",
        resolutionStatus: ResolutionStatus.RESOLVED,
        confidenceScore: 1
      }
    });
    expect(updateDeckCard).toHaveBeenNthCalledWith(2, {
      where: {
        id: "deck-card-2"
      },
      data: {
        cardId: undefined,
        resolvedEnglishName: undefined,
        resolutionStatus: ResolutionStatus.AMBIGUOUS,
        confidenceScore: undefined
      }
    });
    expect(updateDeckCard).toHaveBeenNthCalledWith(3, {
      where: {
        id: "deck-card-3"
      },
      data: {
        cardId: undefined,
        resolvedEnglishName: undefined,
        resolutionStatus: ResolutionStatus.UNRESOLVED,
        confidenceScore: undefined
      }
    });
    expect(transaction).toHaveBeenCalledWith(["update-operation", "update-operation", "update-operation"]);
    expect(result).toMatchObject({
      deckId: "deck-id",
      resolved: 1,
      ambiguous: 1,
      unresolved: 1
    });
  });

  it("rejects missing decks", async () => {
    findDeck.mockResolvedValue(null);

    await expect(useCase.execute("missing-deck")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects decks without extracted cards", async () => {
    findDeck.mockResolvedValue({
      id: "deck-id",
      deckCards: []
    });

    await expect(useCase.execute("deck-id")).rejects.toBeInstanceOf(BadRequestException);
  });
});
