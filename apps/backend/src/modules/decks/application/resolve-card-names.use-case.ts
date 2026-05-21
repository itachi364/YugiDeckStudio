import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ResolutionStatus } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import {
  CARD_NAME_RESOLVER_PORT,
  CardNameCandidate,
  CardNameResolverPort
} from "../ports/card-name-resolver.port";

export interface ResolvedDeckCardResult {
  deckCardId: string;
  originalName: string;
  resolutionStatus: ResolutionStatus;
  resolvedEnglishName?: string;
  cardId?: string;
  candidates?: CardNameCandidate[];
}

export interface ResolveCardNamesResult {
  deckId: string;
  resolved: number;
  ambiguous: number;
  unresolved: number;
  cards: ResolvedDeckCardResult[];
}

@Injectable()
export class ResolveCardNamesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CARD_NAME_RESOLVER_PORT) private readonly cardNameResolver: CardNameResolverPort
  ) {}

  async execute(deckId: string): Promise<ResolveCardNamesResult> {
    const deck = await this.prisma.deck.findUnique({
      where: {
        id: deckId
      },
      select: {
        id: true,
        deckCards: {
          orderBy: [
            {
              section: "asc"
            },
            {
              displayOrder: "asc"
            }
          ],
          select: {
            id: true,
            originalName: true
          }
        }
      }
    });

    if (!deck) {
      throw new NotFoundException("El deck indicado no existe.");
    }

    if (deck.deckCards.length === 0) {
      throw new BadRequestException("El deck debe tener cartas extraídas antes de resolver nombres.");
    }

    const results: ResolvedDeckCardResult[] = [];
    const operations = [];

    for (const deckCard of deck.deckCards) {
      const candidates = await this.cardNameResolver.findCandidates(deckCard.originalName);
      const result = this.resolveDeckCard(deckCard.id, deckCard.originalName, candidates);

      results.push(result);
      operations.push(
        this.prisma.deckCard.update({
          where: {
            id: deckCard.id
          },
          data: {
            cardId: result.cardId,
            resolvedEnglishName: result.resolvedEnglishName,
            resolutionStatus: result.resolutionStatus,
            confidenceScore: result.resolutionStatus === ResolutionStatus.RESOLVED ? 1 : undefined
          }
        })
      );
    }

    await this.prisma.$transaction(operations);

    return {
      deckId,
      resolved: results.filter((result) => result.resolutionStatus === ResolutionStatus.RESOLVED).length,
      ambiguous: results.filter((result) => result.resolutionStatus === ResolutionStatus.AMBIGUOUS).length,
      unresolved: results.filter((result) => result.resolutionStatus === ResolutionStatus.UNRESOLVED).length,
      cards: results
    };
  }

  private resolveDeckCard(
    deckCardId: string,
    originalName: string,
    candidates: CardNameCandidate[]
  ): ResolvedDeckCardResult {
    if (candidates.length === 1) {
      const [candidate] = candidates;

      return {
        deckCardId,
        originalName,
        resolutionStatus: ResolutionStatus.RESOLVED,
        resolvedEnglishName: candidate.officialName,
        cardId: candidate.id
      };
    }

    if (candidates.length > 1) {
      return {
        deckCardId,
        originalName,
        resolutionStatus: ResolutionStatus.AMBIGUOUS,
        candidates
      };
    }

    return {
      deckCardId,
      originalName,
      resolutionStatus: ResolutionStatus.UNRESOLVED
    };
  }
}
