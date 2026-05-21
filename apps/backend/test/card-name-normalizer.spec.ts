import { CardNameNormalizer } from "../src/modules/decks/domain/card-name-normalizer";

describe("CardNameNormalizer", () => {
  const normalizer = new CardNameNormalizer();

  it("normalizes accents, punctuation, spaces and case", () => {
    expect(normalizer.normalize("  Dragón   Blanco-de Ojos AZULES!! ")).toBe("dragon blanco de ojos azules");
  });
});
