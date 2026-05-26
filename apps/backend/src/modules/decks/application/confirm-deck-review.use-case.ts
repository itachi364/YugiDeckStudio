import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DeckStatus, ExtractionStatus, ReviewStatus } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { DeckCompositionPolicyService } from "./deck-composition-policy.service";

export interface ConfirmDeckReviewResult {
  deckId: string;
  status: DeckStatus;
  reviewStatus: ReviewStatus;
  cardCount: number;
}

@Injectable()
export class ConfirmDeckReviewUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deckCompositionPolicy: DeckCompositionPolicyService
  ) {}

  async execute(deckId: string): Promise<ConfirmDeckReviewResult> {
    const deck = await this.prisma.deck.findUnique({
      where: {
        id: deckId
      },
      select: {
        id: true,
        extractionStatus: true,
        reviewStatus: true,
        deckCards: {
          select: {
            id: true,
            section: true,
            quantity: true,
            originalName: true
          }
        }
      }
    });

    if (!deck) {
      throw new NotFoundException("El deck indicado no existe.");
    }

    if (deck.extractionStatus !== ExtractionStatus.EXTRACTED) {
      throw new BadRequestException("El deck debe estar importado desde Neuron antes de confirmar revisión.");
    }

    if (deck.deckCards.length === 0) {
      throw new BadRequestException("El deck debe tener cartas importadas o corregidas antes de confirmar revisión.");
    }

    if (deck.reviewStatus === ReviewStatus.CONFIRMED) {
      throw new ConflictException("La revisión del deck ya fue confirmada.");
    }

    this.deckCompositionPolicy.assertValidCounts(deck.deckCards);

    const updatedDeck = await this.prisma.deck.update({
      where: {
        id: deckId
      },
      data: {
        reviewStatus: ReviewStatus.CONFIRMED,
        status: DeckStatus.REVIEWED
      },
      select: {
        id: true,
        status: true,
        reviewStatus: true
      }
    });

    const totals = this.deckCompositionPolicy.calculateTotals(deck.deckCards);

    return {
      deckId: updatedDeck.id,
      status: updatedDeck.status,
      reviewStatus: updatedDeck.reviewStatus,
      cardCount: totals.main + totals.extra + totals.side
    };
  }
}
