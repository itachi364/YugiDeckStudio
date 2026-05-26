import { Injectable, NotFoundException } from "@nestjs/common";
import { DeckSection, DeckStatus, ExtractionStatus, ReviewStatus } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

export interface GetDeckCardResult {
  section: DeckSection;
  quantity: number;
  originalName: string;
  displayOrder: number;
}

export interface GetDeckCardsResult {
  deckId: string;
  status: DeckStatus;
  extractionStatus: ExtractionStatus;
  reviewStatus: ReviewStatus;
  source: "NEURON";
  cards: GetDeckCardResult[];
}

@Injectable()
export class GetDeckCardsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(deckId: string): Promise<GetDeckCardsResult> {
    const deck = await this.prisma.deck.findUnique({
      where: {
        id: deckId
      },
      select: {
        id: true,
        status: true,
        extractionStatus: true,
        reviewStatus: true,
        deckCards: {
          select: {
            section: true,
            quantity: true,
            originalName: true,
            displayOrder: true
          }
        }
      }
    });

    if (!deck) {
      throw new NotFoundException("El deck indicado no existe.");
    }

    return {
      deckId: deck.id,
      status: deck.status,
      extractionStatus: deck.extractionStatus,
      reviewStatus: deck.reviewStatus,
      source: "NEURON",
      cards: this.sortCards(deck.deckCards)
    };
  }

  private sortCards(cards: GetDeckCardResult[]): GetDeckCardResult[] {
    const sectionOrder: Record<DeckSection, number> = {
      [DeckSection.MAIN]: 1,
      [DeckSection.EXTRA]: 2,
      [DeckSection.SIDE]: 3
    };

    return [...cards].sort(
      (left, right) =>
        sectionOrder[left.section] - sectionOrder[right.section] || left.displayOrder - right.displayOrder
    );
  }
}
