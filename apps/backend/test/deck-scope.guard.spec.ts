import { NotFoundException } from "@nestjs/common";
import { DeckScopeGuard } from "../src/modules/auth/infrastructure/deck-scope.guard";

describe("DeckScopeGuard", () => {
  const findDeck = jest.fn();
  const assertCanAccessStore = jest.fn();
  const guard = new DeckScopeGuard(
    {
      deck: {
        findUnique: findDeck
      }
    } as never,
    {
      assertCanAccessStore
    } as never
  );

  const context = (request: unknown) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request
      })
    }) as never;

  beforeEach(() => {
    jest.clearAllMocks();
    findDeck.mockResolvedValue({
      storeId: "store-id"
    });
  });

  it("resolves deck store scope and validates access", async () => {
    const request = {
      user: {
        sub: "user-id"
      },
      params: {
        deckId: "deck-id"
      }
    };

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(findDeck).toHaveBeenCalledWith({
      where: {
        id: "deck-id"
      },
      select: {
        storeId: true
      }
    });
    expect(assertCanAccessStore).toHaveBeenCalledWith(request.user, "store-id");
  });

  it("rejects missing decks", async () => {
    findDeck.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        context({
          user: {
            sub: "user-id"
          },
          params: {
            deckId: "missing"
          }
        })
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
