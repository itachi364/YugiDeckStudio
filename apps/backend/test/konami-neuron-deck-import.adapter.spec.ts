import { BadRequestException } from "@nestjs/common";
import { DeckSection } from "@prisma/client";
import { KonamiNeuronDeckImportAdapter } from "../src/modules/decks/infrastructure/konami-neuron-deck-import.adapter";

describe("KonamiNeuronDeckImportAdapter", () => {
  const fetchMock = jest.fn();
  const adapter = new KonamiNeuronDeckImportAdapter();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as never;
  });

  it("imports Main, Extra and Side deck cards from Konami HTML", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      url: "https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=id&dno=14",
      text: jest.fn().mockResolvedValue(`
        <table id="monster_list"><tr class=' row'><td class="card_name"><span>Silvy of the White Forest</span></td><td class="num"><span>3</span></td></tr></table>
        <table id="spell_list"><tr class=' row'><td class="card_name"><span>Ash Blossom &amp; Joyous Spring</span></td><td class="num"><span>2</span></td></tr></table>
        <table id="extra_list"><tr class=' row'><td class="card_name"><span>Diabell, Queen of the White Forest</span></td><td class="num"><span>1</span></td></tr></table>
        <table id="side_list"><tr class=' row'><td class="card_name"><span>Ghost Belle &amp; Haunted Mansion</span></td><td class="num"><span>
          2
        </span></td></tr></table>
      `)
    });

    const result = await adapter.importDeck("https://neuron.konami.net/link/6omm271xgfka1d95");

    expect(fetchMock).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ redirect: "follow" }));
    expect(result.sourceUrl).toBe("https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=id&dno=14");
    expect(result.cards).toEqual([
      {
        section: DeckSection.MAIN,
        quantity: 3,
        originalName: "Silvy of the White Forest",
        displayOrder: 1
      },
      {
        section: DeckSection.MAIN,
        quantity: 2,
        originalName: "Ash Blossom & Joyous Spring",
        displayOrder: 2
      },
      {
        section: DeckSection.EXTRA,
        quantity: 1,
        originalName: "Diabell, Queen of the White Forest",
        displayOrder: 1
      },
      {
        section: DeckSection.SIDE,
        quantity: 2,
        originalName: "Ghost Belle & Haunted Mansion",
        displayOrder: 1
      }
    ]);
  });

  it("rejects non Konami hosts before performing HTTP requests", async () => {
    await expect(adapter.importDeck("https://example.com/deck")).rejects.toBeInstanceOf(BadRequestException);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects Konami pages without parseable deck cards", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      url: "https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=id&dno=14",
      text: jest.fn().mockResolvedValue("<html></html>")
    });

    await expect(adapter.importDeck("https://neuron.konami.net/link/6omm271xgfka1d95")).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("rejects failed HTTP responses", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      url: "https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=id&dno=14"
    });

    await expect(adapter.importDeck("https://neuron.konami.net/link/6omm271xgfka1d95")).rejects.toBeInstanceOf(
      BadRequestException
    );
  });
});
