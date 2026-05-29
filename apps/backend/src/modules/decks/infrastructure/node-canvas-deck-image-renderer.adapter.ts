import { Injectable } from "@nestjs/common";
import { DeckSection } from "@prisma/client";
import { createCanvas, loadImage } from "canvas";
import {
  DeckImageRendererPort,
  RenderableDeckCard,
  RenderDeckImageInput,
  RenderDeckImageOutput
} from "../ports/deck-image-renderer.port";

interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CardGridLayout {
  columns: number;
  gap: number;
  cardWidth: number;
  cardHeight: number;
}

@Injectable()
export class NodeCanvasDeckImageRendererAdapter implements DeckImageRendererPort {
  private readonly width = 1080;
  private readonly height = 1350;

  async render(input: RenderDeckImageInput): Promise<RenderDeckImageOutput> {
    const canvas = createCanvas(this.width, this.height);
    const context = canvas.getContext("2d");

    await this.drawBackground(context, input);
    await this.drawHeader(context, input);
    await this.drawDeckSection(context, "Main Deck", DeckSection.MAIN, input.cards, {
      x: 32,
      y: 318,
      width: 1016,
      height: 570
    });
    await this.drawDeckSection(context, "Extra Deck", DeckSection.EXTRA, input.cards, {
      x: 32,
      y: 918,
      width: 1016,
      height: 122
    });
    await this.drawDeckSection(context, "Side Deck", DeckSection.SIDE, input.cards, {
      x: 32,
      y: 1077,
      width: 1016,
      height: 122
    });
    await this.drawFooter(context, input);

    return {
      buffer: canvas.toBuffer("image/png"),
      width: this.width,
      height: this.height,
      mimeType: "image/png"
    };
  }

  private async drawBackground(
    context: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
    input: RenderDeckImageInput
  ): Promise<void> {
    context.fillStyle = input.backgroundColor || "#10131a";
    context.fillRect(0, 0, this.width, this.height);

    if (input.backgroundImagePath) {
      const background = await loadImage(input.backgroundImagePath);
      this.drawCoverImage(context, background, 0, 0, this.width, this.height);
    }

    context.fillStyle = "rgba(0, 0, 0, 0.56)";
    context.fillRect(0, 0, this.width, this.height);
  }

  private async drawHeader(
    context: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
    input: RenderDeckImageInput
  ): Promise<void> {
    const topRightLogoPath = input.tournamentLogoPath ?? input.eventLogoPath;
    const logoPaths = [input.primaryLogoPath, input.secondaryLogoPath, topRightLogoPath].filter(Boolean) as string[];
    const logoSlots = [
      { x: 42, y: 38, width: 220, height: 95 },
      { x: 430, y: 28, width: 220, height: 115 },
      { x: 858, y: 34, width: 145, height: 145 }
    ];

    for (let index = 0; index < logoPaths.length && index < logoSlots.length; index += 1) {
      const image = await loadImage(logoPaths[index]);
      this.drawContainImage(context, image, logoSlots[index]);
    }

    context.textAlign = "right";
    context.fillStyle = "#ffffff";
    context.strokeStyle = "rgba(0, 0, 0, 0.88)";
    context.lineWidth = 6;
    context.font = "bold 44px Arial";
    const title = `${input.resultLabel} / ${input.playerName}`;
    context.strokeText(title, 1038, 198);
    context.fillText(title, 1038, 198);

    context.font = "bold 34px Arial";
    const subtitle = [input.tournamentName, input.deckName].filter(Boolean).join(" - ");
    context.strokeText(subtitle || input.deckName, 1038, 242);
    context.fillText(subtitle || input.deckName, 1038, 242);

    context.font = "24px Arial";
    const date = input.tournamentDate.toISOString().slice(0, 10);
    const eventLabel = [input.eventTypeName, date].filter(Boolean).join(" | ");
    context.strokeText(eventLabel, 1038, 282);
    context.fillText(eventLabel, 1038, 282);
  }

  private async drawDeckSection(
    context: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
    label: string,
    section: DeckSection,
    cards: RenderableDeckCard[],
    box: LayoutBox
  ): Promise<void> {
    const expandedCards = cards
      .filter((card) => card.section === section)
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .flatMap((card) => Array.from({ length: card.quantity }, () => card));

    context.textAlign = "left";
    context.font = "bold 28px Arial";
    context.lineWidth = 5;
    context.strokeStyle = "rgba(0, 0, 0, 0.85)";
    context.fillStyle = "#ffffff";
    context.strokeText(`${label} (${expandedCards.length})`, box.x, box.y - 12);
    context.fillText(`${label} (${expandedCards.length})`, box.x, box.y - 12);

    const { columns, gap, cardWidth, cardHeight } = this.calculateGridLayout(section, expandedCards.length, box);

    for (let index = 0; index < expandedCards.length; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = box.x + column * (cardWidth + gap);
      const y = box.y + row * (cardHeight + gap);

      const image = await loadImage(expandedCards[index].imagePath);
      context.fillStyle = "rgba(255, 255, 255, 0.9)";
      this.roundRect(context, x - 3, y - 3, cardWidth + 6, cardHeight + 6, 5);
      context.fill();
      context.drawImage(image, x, y, cardWidth, cardHeight);
    }
  }

  private calculateGridLayout(section: DeckSection, cardCount: number, box: LayoutBox): CardGridLayout {
    if (section !== DeckSection.MAIN) {
      const columns = 15;
      const gap = 6;
      const cardWidth = Math.floor((box.width - gap * (columns - 1)) / columns);
      return {
        columns,
        gap,
        cardWidth,
        cardHeight: Math.floor(cardWidth * 1.45)
      };
    }

    const gap = 8;
    const minimumColumns = 10;
    const maximumColumns = 15;

    for (let columns = minimumColumns; columns <= maximumColumns; columns += 1) {
      const rows = Math.max(1, Math.ceil(cardCount / columns));
      const cardWidth = Math.floor((box.width - gap * (columns - 1)) / columns);
      const cardHeight = Math.floor(cardWidth * 1.45);
      const requiredHeight = rows * cardHeight + Math.max(0, rows - 1) * gap;

      if (requiredHeight <= box.height) {
        return {
          columns,
          gap,
          cardWidth,
          cardHeight
        };
      }
    }

    const columns = maximumColumns;
    const cardWidth = Math.floor((box.width - gap * (columns - 1)) / columns);

    return {
      columns,
      gap,
      cardWidth,
      cardHeight: Math.floor(cardWidth * 1.45)
    };
  }

  private async drawFooter(
    context: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
    input: RenderDeckImageInput
  ): Promise<void> {
    const orderedSocialLinks = [...input.socialLinks].sort((left, right) => left.displayOrder - right.displayOrder);
    let cursorX = 42;

    for (const socialLink of orderedSocialLinks) {
      if (socialLink.iconPath) {
        const icon = await loadImage(socialLink.iconPath);
        this.drawContainImage(context, icon, { x: cursorX, y: 1260, width: 34, height: 34 });
        cursorX += 42;
      }

      context.fillStyle = "#ffffff";
      context.textAlign = "left";
      context.font = "bold 24px Arial";
      context.fillText(socialLink.handle || socialLink.platform, cursorX, 1286);
      cursorX += context.measureText(socialLink.handle || socialLink.platform).width + 30;
    }

    context.textAlign = "right";
    context.font = "bold 24px Arial";
    context.fillStyle = "#ffffff";
    context.fillText(input.sourceCreditText || "YugiDeckStudio", 1038, 1288);
  }

  private drawCoverImage(
    context: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
    image: Awaited<ReturnType<typeof loadImage>>,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const scale = Math.max(width / image.width, height / image.height);
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    context.drawImage(image, x + (width - scaledWidth) / 2, y + (height - scaledHeight) / 2, scaledWidth, scaledHeight);
  }

  private drawContainImage(
    context: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
    image: Awaited<ReturnType<typeof loadImage>>,
    box: LayoutBox
  ): void {
    const scale = Math.min(box.width / image.width, box.height / image.height);
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    context.drawImage(image, box.x + (box.width - scaledWidth) / 2, box.y + (box.height - scaledHeight) / 2, scaledWidth, scaledHeight);
  }

  private roundRect(
    context: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }
}
