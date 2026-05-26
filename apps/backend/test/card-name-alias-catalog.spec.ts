import { CardNameAliasCatalog } from "../src/modules/decks/domain/card-name-alias-catalog";
import { CardNameNormalizer } from "../src/modules/decks/domain/card-name-normalizer";

describe("CardNameAliasCatalog", () => {
  const catalog = new CardNameAliasCatalog(new CardNameNormalizer());

  it("resolves Spanish names to official English card names", () => {
    expect(catalog.resolveOfficialName("Silvy del Bosque Blanco")).toBe("Silvy of the White Forest");
  });

  it("resolves common manual correction variants to official English card names", () => {
    expect(catalog.resolveOfficialName("Engafio del Botin del Pecado")).toBe("Deception of the Sinful Spoils");
    expect(catalog.resolveOfficialName("Diabelize la Bruja Blanca")).toBe("Diabellze the White Witch");
  });

  it("returns null when no local alias exists", () => {
    expect(catalog.resolveOfficialName("Unknown handwritten card")).toBeNull();
  });
});
