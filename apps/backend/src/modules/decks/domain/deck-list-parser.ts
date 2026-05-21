import { DeckSection } from "@prisma/client";

export interface ParsedDeckCard {
  section: DeckSection;
  quantity: number;
  originalName: string;
  displayOrder: number;
}

export class DeckListParser {
  parse(rawText: string): ParsedDeckCard[] {
    const cards: ParsedDeckCard[] = [];
    const sectionOrders = new Map<DeckSection, number>([
      [DeckSection.MAIN, 0],
      [DeckSection.EXTRA, 0],
      [DeckSection.SIDE, 0]
    ]);
    let currentSection: DeckSection = DeckSection.MAIN;

    for (const rawLine of rawText.split(/\r?\n/)) {
      const line = this.cleanLine(rawLine);

      if (!line) {
        continue;
      }

      const detectedSection = this.detectSection(line);

      if (detectedSection) {
        currentSection = detectedSection;
        continue;
      }

      if (this.shouldIgnoreLine(line)) {
        continue;
      }

      const parsedLine = this.parseCardLine(line);

      if (!parsedLine) {
        continue;
      }

      const displayOrder = (sectionOrders.get(currentSection) ?? 0) + 1;
      sectionOrders.set(currentSection, displayOrder);
      cards.push({
        section: currentSection,
        quantity: parsedLine.quantity,
        originalName: parsedLine.originalName,
        displayOrder
      });
    }

    return cards;
  }

  private parseCardLine(line: string): { quantity: number; originalName: string } | null {
    const match = line.match(/^(\d{1,2})\s+(.+)$/);

    if (!match) {
      return null;
    }

    const quantity = Number(match[1]);
    const originalName = match[2]
      .replace(/\s{2,}/g, " ")
      .replace(/[|]+$/g, "")
      .trim();

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 3 || originalName.length < 2) {
      return null;
    }

    return {
      quantity,
      originalName
    };
  }

  private detectSection(line: string): DeckSection | null {
    const normalized = this.normalize(line);

    if (
      normalized.includes("extra deck") ||
      normalized.includes("deck extra") ||
      normalized.includes("cartas extra")
    ) {
      return DeckSection.EXTRA;
    }

    if (normalized.includes("side deck") || normalized.includes("side") || normalized.includes("banquillo")) {
      return DeckSection.SIDE;
    }

    if (
      normalized.includes("main deck") ||
      normalized.includes("deck principal") ||
      normalized.includes("cartas de monstruo") ||
      normalized.includes("cartas magicas") ||
      normalized.includes("cartas de trampa")
    ) {
      return DeckSection.MAIN;
    }

    return null;
  }

  private shouldIgnoreLine(line: string): boolean {
    const normalized = this.normalize(line);
    return (
      normalized.includes("total") ||
      normalized.includes("nombre completo") ||
      normalized.includes("fecha") ||
      normalized.includes("evento") ||
      normalized.includes("infracciones") ||
      normalized.includes("descripcion")
    );
  }

  private cleanLine(line: string): string {
    return line.replace(/\t/g, " ").replace(/\s{2,}/g, " ").trim();
  }

  private normalize(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }
}
