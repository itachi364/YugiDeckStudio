import { LocalCardCacheNameResolverAdapter } from "../src/modules/decks/infrastructure/local-card-cache-name-resolver.adapter";
import { CardNameNormalizer } from "../src/modules/decks/domain/card-name-normalizer";

describe("LocalCardCacheNameResolverAdapter", () => {
  const findMany = jest.fn();
  const adapter = new LocalCardCacheNameResolverAdapter(
    {
      card: {
        findMany
      }
    } as never,
    new CardNameNormalizer()
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("finds candidates using normalized official names", async () => {
    findMany.mockResolvedValue([
      {
        id: "card-1",
        officialName: "Blue-Eyes White Dragon"
      },
      {
        id: "card-2",
        officialName: "Dark Magician"
      }
    ]);

    await expect(adapter.findCandidates("blue eyes white dragon")).resolves.toEqual([
      {
        id: "card-1",
        officialName: "Blue-Eyes White Dragon"
      }
    ]);
  });
});
