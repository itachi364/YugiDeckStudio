import { DeckSection } from "@prisma/client";
import { DeckListParser } from "../src/modules/decks/domain/deck-list-parser";

describe("DeckListParser", () => {
  const parser = new DeckListParser();

  it("extracts quantities, names and sections from OCR text", () => {
    const cards = parser.parse(`
      Main Deck
      3 Silvy del Bosque Blanco
      2 Elzette del Bosque Blanco
      Total Cartas de Monstruo
      Extra Deck
      1 Diabell, Reina del Bosque Blanco
      Side Deck
      2 Purulia Multivadora
    `);

    expect(cards).toEqual([
      {
        section: DeckSection.MAIN,
        quantity: 3,
        originalName: "Silvy del Bosque Blanco",
        displayOrder: 1
      },
      {
        section: DeckSection.MAIN,
        quantity: 2,
        originalName: "Elzette del Bosque Blanco",
        displayOrder: 2
      },
      {
        section: DeckSection.EXTRA,
        quantity: 1,
        originalName: "Diabell, Reina del Bosque Blanco",
        displayOrder: 1
      },
      {
        section: DeckSection.SIDE,
        quantity: 2,
        originalName: "Purulia Multivadora",
        displayOrder: 1
      }
    ]);
  });

  it("treats Spanish monster, spell and trap table headers as main deck", () => {
    const cards = parser.parse(`
      Cartas de Monstruo
      3 Diabellstar la Bruja Negra
      Cartas Magicas
      1 Talento de Tacticas Triples
      Cartas de Trampa
      1 Infinito Temporal
    `);

    expect(cards.map((card) => card.section)).toEqual([DeckSection.MAIN, DeckSection.MAIN, DeckSection.MAIN]);
  });
});
