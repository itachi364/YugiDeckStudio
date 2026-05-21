import { DeckSection } from "@prisma/client";
import { createCanvas } from "canvas";
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
});
