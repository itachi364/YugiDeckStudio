import { ForbiddenException, Injectable } from "@nestjs/common";
import { DeckStatus, ExtractionStatus, ReviewStatus } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { AuthenticatedUserPayload } from "../../auth/ports/auth-token.port";

export interface ListedDeckResult {
  deckId: string;
  storeId: string;
  storeName: string;
  playerName: string;
  deckName: string;
  resultLabel: string;
  tournamentDate: Date;
  status: DeckStatus;
  extractionStatus: ExtractionStatus;
  reviewStatus: ReviewStatus;
  cardCount: number;
  createdAt: Date;
}

@Injectable()
export class ListDecksUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(user: AuthenticatedUserPayload): Promise<ListedDeckResult[]> {
    if (!user.isRoot && !user.storeId) {
      throw new ForbiddenException("El usuario no tiene una tienda asociada.");
    }

    const decks = await this.prisma.deck.findMany({
      where: {
        ...(user.isRoot ? {} : { storeId: user.storeId as string }),
        status: {
          not: DeckStatus.INACTIVE
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        storeId: true,
        deckName: true,
        resultLabel: true,
        status: true,
        extractionStatus: true,
        reviewStatus: true,
        createdAt: true,
        player: {
          select: {
            displayName: true
          }
        },
        store: {
          select: {
            name: true
          }
        },
        tournament: {
          select: {
            eventDate: true
          }
        },
        deckCards: {
          select: {
            quantity: true
          }
        }
      }
    });

    return decks.map((deck) => ({
      deckId: deck.id,
      storeId: deck.storeId,
      storeName: deck.store.name,
      playerName: deck.player.displayName,
      deckName: deck.deckName,
      resultLabel: deck.resultLabel,
      tournamentDate: deck.tournament.eventDate,
      status: deck.status,
      extractionStatus: deck.extractionStatus,
      reviewStatus: deck.reviewStatus,
      cardCount: deck.deckCards.reduce((total, card) => total + card.quantity, 0),
      createdAt: deck.createdAt
    }));
  }
}
