import { DeckSection } from "@prisma/client";
import { createCanvas, loadImage } from "canvas";
import { NodeCanvasDeckImageRendererAdapter } from "../src/modules/decks/infrastructure/node-canvas-deck-image-renderer.adapter";

describe("NodeCanvasDeckImageRendererAdapter", () => {
  const adapter = new NodeCanvasDeckImageRendererAdapter();

  it("renders the base deck image template at 1080x1350", async () => {
    const cardCanvas = createCanvas(120, 174);
    const context = cardCanvas.getContext("2d");
    context.fillStyle = "#f97316";
    context.fillRect(0, 0, 120, 174);
    const cardDataUrl = cardCanvas.toDataURL("image/png");

    const result = await adapter.render({
      playerName: "Kaiba",
      tournamentDate: new Date("2026-05-01T00:00:00.000Z"),
      resultLabel: "Top 8",
      deckName: "Blue-Eyes",
      tournamentName: "Local WCQ",
      backgroundColor: "#111827",
      sourceCreditText: "ReadyForDuel",
      socialLinks: [
        {
          platform: "Instagram",
          handle: "@readyforduel",
          displayOrder: 1
        }
      ],
      cards: [
        {
          section: DeckSection.MAIN,
          quantity: 1,
          name: "Blue-Eyes White Dragon",
          imagePath: cardDataUrl,
          displayOrder: 1
        },
        {
          section: DeckSection.EXTRA,
          quantity: 1,
          name: "Blue-Eyes Ultimate Dragon",
          imagePath: cardDataUrl,
          displayOrder: 1
        },
        {
          section: DeckSection.SIDE,
          quantity: 1,
          name: "Effect Veiler",
          imagePath: cardDataUrl,
          displayOrder: 1
        }
      ]
    });

    expect(result.width).toBe(1080);
    expect(result.height).toBe(1350);
    expect(result.mimeType).toBe("image/png");
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("renders every main deck card without truncating legal deck sizes", async () => {
    const regularCardDataUrl = createSolidCardDataUrl("#f97316");
    const lastCardDataUrl = createSolidCardDataUrl("#22c55e");

    const cards = Array.from({ length: 42 }, (_, index) => ({
      section: DeckSection.MAIN,
      quantity: 1,
      name: `Main Deck Card ${index + 1}`,
      imagePath: index === 41 ? lastCardDataUrl : regularCardDataUrl,
      displayOrder: index + 1
    }));

    const result = await adapter.render({
      playerName: "Kaiba",
      tournamentDate: new Date("2026-05-01T00:00:00.000Z"),
      resultLabel: "Top 8",
      deckName: "Blue-Eyes",
      tournamentName: "Local WCQ",
      backgroundColor: "#111827",
      sourceCreditText: "ReadyForDuel",
      socialLinks: [],
      cards: [
        ...cards,
        {
          section: DeckSection.EXTRA,
          quantity: 1,
          name: "Blue-Eyes Ultimate Dragon",
          imagePath: regularCardDataUrl,
          displayOrder: 1
        },
        {
          section: DeckSection.SIDE,
          quantity: 1,
          name: "Effect Veiler",
          imagePath: regularCardDataUrl,
          displayOrder: 1
        }
      ]
    });

    const image = await loadImage(result.buffer);
    const canvas = createCanvas(result.width, result.height);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);

    const lastCardCenter = context.getImageData(819, 773, 1, 1).data;

    expect(lastCardCenter[0]).toBeLessThan(80);
    expect(lastCardCenter[1]).toBeGreaterThan(150);
    expect(lastCardCenter[2]).toBeLessThan(120);
  });

  it("renders tournament, event and social logos in their configured positions", async () => {
    const cardDataUrl = createSolidCardDataUrl("#f97316");
    const tournamentLogoDataUrl = createSolidLogoDataUrl("#ef4444");
    const eventLogoDataUrl = createSolidLogoDataUrl("#3b82f6");
    const socialLogoDataUrl = createSolidLogoDataUrl("#22c55e");

    const result = await adapter.render({
      playerName: "Kaiba",
      tournamentDate: new Date("2026-05-01T00:00:00.000Z"),
      resultLabel: "Ganador",
      deckName: "Blue-Eyes",
      tournamentName: "Local WCQ",
      backgroundColor: "#111827",
      sourceCreditText: "ReadyForDuel",
      tournamentLogoPath: tournamentLogoDataUrl,
      eventLogoPath: eventLogoDataUrl,
      socialLinks: [
        {
          platform: "Instagram",
          handle: "@readyforduel",
          displayOrder: 1,
          iconPath: socialLogoDataUrl
        }
      ],
      cards: [
        {
          section: DeckSection.MAIN,
          quantity: 1,
          name: "Blue-Eyes White Dragon",
          imagePath: cardDataUrl,
          displayOrder: 1
        },
        {
          section: DeckSection.EXTRA,
          quantity: 1,
          name: "Blue-Eyes Ultimate Dragon",
          imagePath: cardDataUrl,
          displayOrder: 1
        },
        {
          section: DeckSection.SIDE,
          quantity: 1,
          name: "Effect Veiler",
          imagePath: cardDataUrl,
          displayOrder: 1
        }
      ]
    });

    const image = await loadImage(result.buffer);
    const canvas = createCanvas(result.width, result.height);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);

    const tournamentLogoPixel = context.getImageData(930, 106, 1, 1).data;
    const eventLogoPixel = context.getImageData(945, 1262, 1, 1).data;
    const socialLogoPixel = context.getImageData(59, 1271, 1, 1).data;

    expect(tournamentLogoPixel[0]).toBeGreaterThan(180);
    expect(tournamentLogoPixel[1]).toBeLessThan(120);
    expect(eventLogoPixel[2]).toBeGreaterThan(180);
    expect(socialLogoPixel[1]).toBeGreaterThan(150);
  });
});

function createSolidCardDataUrl(color: string): string {
  const cardCanvas = createCanvas(120, 174);
  const context = cardCanvas.getContext("2d");
  context.fillStyle = color;
  context.fillRect(0, 0, 120, 174);
  return cardCanvas.toDataURL("image/png");
}

function createSolidLogoDataUrl(color: string): string {
  const logoCanvas = createCanvas(120, 80);
  const context = logoCanvas.getContext("2d");
  context.fillStyle = color;
  context.fillRect(0, 0, 120, 80);
  return logoCanvas.toDataURL("image/png");
}
