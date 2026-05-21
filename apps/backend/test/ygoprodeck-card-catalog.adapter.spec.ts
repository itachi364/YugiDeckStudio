import { ConfigService } from "@nestjs/config";
import { CardNameNormalizer } from "../src/modules/decks/domain/card-name-normalizer";
import { YgoprodeckCardCatalogAdapter } from "../src/modules/decks/infrastructure/ygoprodeck-card-catalog.adapter";

describe("YgoprodeckCardCatalogAdapter", () => {
  const findMany = jest.fn();
  const upsert = jest.fn();
  const fetchMock = jest.fn();

  const adapter = new YgoprodeckCardCatalogAdapter(
    {
      card: {
        findMany,
        upsert
      }
    } as never,
    new CardNameNormalizer(),
    {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          YGOPRODECK_API_BASE_URL: "https://db.ygoprodeck.com/api/v7",
          YGOPRODECK_RATE_LIMIT_PER_SECOND: "1000"
        };

        return values[key];
      })
    } as unknown as ConfigService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
    findMany.mockResolvedValue([]);
    upsert.mockResolvedValue({
      id: "card-1",
      officialName: "Blue-Eyes White Dragon"
    });
  });

  it("uses local cache before calling YGOPRODeck", async () => {
    findMany.mockResolvedValue([
      {
        id: "card-1",
        officialName: "Blue-Eyes White Dragon"
      }
    ]);

    await expect(adapter.findCandidates("blue eyes white dragon")).resolves.toEqual([
      {
        id: "card-1",
        officialName: "Blue-Eyes White Dragon"
      }
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches exact card data by name and persists it when cache is empty", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: [
          {
            id: 89631139,
            name: "Blue-Eyes White Dragon",
            type: "Normal Monster",
            frameType: "normal",
            card_images: [
              {
                image_url: "https://images.ygoprodeck.com/images/cards/89631139.jpg"
              }
            ]
          }
        ]
      })
    });

    await expect(adapter.findCandidates("Blue-Eyes White Dragon")).resolves.toEqual([
      {
        id: "card-1",
        officialName: "Blue-Eyes White Dragon"
      }
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://db.ygoprodeck.com/api/v7/cardinfo.php?name=Blue-Eyes+White+Dragon"
    );
    expect(upsert).toHaveBeenCalledWith({
      where: {
        ygoprodeckId: 89631139
      },
      create: expect.objectContaining({
        ygoprodeckId: 89631139,
        officialName: "Blue-Eyes White Dragon",
        cardType: "Normal Monster",
        frameType: "normal",
        imageUrlSource: "https://images.ygoprodeck.com/images/cards/89631139.jpg"
      }),
      update: expect.objectContaining({
        officialName: "Blue-Eyes White Dragon",
        imageUrlSource: "https://images.ygoprodeck.com/images/cards/89631139.jpg"
      }),
      select: {
        id: true,
        officialName: true
      }
    });
  });

  it("falls back to fuzzy search when exact lookup has no results", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [
            {
              id: 46986414,
              name: "Dark Magician",
              type: "Normal Monster",
              frameType: "normal",
              card_images: []
            }
          ]
        })
      });
    upsert.mockResolvedValue({
      id: "card-2",
      officialName: "Dark Magician"
    });

    await expect(adapter.findCandidates("Dark Magic")).resolves.toEqual([
      {
        id: "card-2",
        officialName: "Dark Magician"
      }
    ]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://db.ygoprodeck.com/api/v7/cardinfo.php?name=Dark+Magic"
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=Dark+Magic"
    );
  });

  it("returns no candidates when cache is empty and YGOPRODeck is unavailable", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(adapter.findCandidates("Missing Card")).resolves.toEqual([]);
    expect(upsert).not.toHaveBeenCalled();
  });
});
