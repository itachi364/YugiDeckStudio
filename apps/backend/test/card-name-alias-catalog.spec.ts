import { CardNameAliasCatalog } from "../src/modules/decks/domain/card-name-alias-catalog";
import { CardNameNormalizer } from "../src/modules/decks/domain/card-name-normalizer";

describe("CardNameAliasCatalog", () => {
  const catalog = new CardNameAliasCatalog(new CardNameNormalizer());

  it("resolves Spanish names to official English card names", () => {
    expect(catalog.resolveOfficialName("Silvy del Bosque Blanco")).toBe("Silvy of the White Forest");
  });

  it("resolves common OCR variants to official English card names", () => {
    expect(catalog.resolveOfficialName("Engafio del Botin del Pecado")).toBe("Deception of the Sinful Spoils");
  });

  it("returns null when no local alias exists", () => {
    expect(catalog.resolveOfficialName("Unknown handwritten card")).toBeNull();
  });
});
