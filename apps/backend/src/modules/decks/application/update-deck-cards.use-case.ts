import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DeckSection, DeckStatus, ExtractionStatus, ResolutionStatus, ReviewStatus } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

export interface CorrectedDeckCardInput {
  section: DeckSection;
  quantity: number;
  originalName: string;
  displayOrder: number;
}

export interface UpdateDeckCardsInput {
  deckId: string;
  cards: CorrectedDeckCardInput[];
}

export interface UpdateDeckCardsResult {
  deckId: string;
  cards: CorrectedDeckCardInput[];
}

@Injectable()
export class UpdateDeckCardsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: UpdateDeckCardsInput): Promise<UpdateDeckCardsResult> {
    this.validateCards(input.cards);

    const deck = await this.prisma.deck.findUnique({
      where: {
        id: input.deckId
      },
      select: {
        id: true,
        extractionStatus: true,
        reviewStatus: true
      }
    });

    if (!deck) {
      throw new NotFoundException("El deck indicado no existe.");
    }

    if (deck.extractionStatus !== ExtractionStatus.EXTRACTED) {
      throw new BadRequestException("El deck debe tener OCR ejecutado antes de corregir cartas.");
    }

    if (deck.reviewStatus === ReviewStatus.CONFIRMED) {
      throw new ConflictException("La revisión del deck ya fue confirmada y no puede corregirse.");
    }

    await this.prisma.$transaction([
      this.prisma.deckCard.deleteMany({
        where: {
          deckId: input.deckId
        }
      }),
      this.prisma.deckCard.createMany({
        data: input.cards.map((card) => ({
          deckId: input.deckId,
          section: card.section,
          quantity: card.quantity,
          originalName: card.originalName.trim(),
          displayOrder: card.displayOrder,
          resolutionStatus: ResolutionStatus.UNRESOLVED
        }))
      }),
      this.prisma.deck.update({
        where: {
          id: input.deckId
        },
        data: {
          status: DeckStatus.EXTRACTED,
          reviewStatus: ReviewStatus.PENDING
        }
      })
    ]);

    return {
      deckId: input.deckId,
      cards: input.cards.map((card) => ({
        ...card,
        originalName: card.originalName.trim()
      }))
    };
  }

  private validateCards(cards: CorrectedDeckCardInput[]): void {
    if (!Array.isArray(cards) || cards.length === 0) {
      throw new BadRequestException("Debe enviar al menos una carta corregida.");
    }

    for (const card of cards) {
      if (!Object.values(DeckSection).includes(card.section)) {
        throw new BadRequestException("La sección de la carta no es válida.");
      }

      if (!Number.isInteger(card.quantity) || card.quantity < 1 || card.quantity > 3) {
        throw new BadRequestException("La cantidad de cada carta debe estar entre 1 y 3.");
      }

      if (typeof card.originalName !== "string" || card.originalName.trim().length < 2) {
        throw new BadRequestException("Cada carta debe tener un nombre original válido.");
      }

      if (!Number.isInteger(card.displayOrder) || card.displayOrder < 1) {
        throw new BadRequestException("Cada carta debe tener un orden visual válido.");
      }
    }
  }
}
