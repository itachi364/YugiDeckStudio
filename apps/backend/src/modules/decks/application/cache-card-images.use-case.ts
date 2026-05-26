import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ImageAssetCategory, RetentionPolicy } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import {
  CARD_IMAGE_STORAGE_PORT,
  CardImageStoragePort
} from "../ports/card-image-storage.port";
import {
  CARD_NAME_RESOLVER_PORT,
  CardNameResolverPort
} from "../ports/card-name-resolver.port";

interface DeckCardForImageCache {
  id: string;
  originalName: string;
  card: {
    id: string;
    ygoprodeckId: number;
    officialName: string;
    imageAssetId: string | null;
    imageUrlSource: string | null;
    imageAsset: {
      id: string;
      storagePath: string;
      deletedAt: Date | null;
    } | null;
  } | null;
}

export interface CachedCardImageResultItem {
  cardId: string;
  officialName: string;
  imageAssetId?: string;
  storagePath?: string;
}

export interface MissingCardImageResultItem {
  cardId: string;
  officialName: string;
  reason: string;
}

export interface CacheCardImagesResult {
  deckId: string;
  cached: CachedCardImageResultItem[];
  alreadyCached: CachedCardImageResultItem[];
  missing: MissingCardImageResultItem[];
}

@Injectable()
export class CacheCardImagesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CARD_IMAGE_STORAGE_PORT) private readonly cardImageStorage: CardImageStoragePort,
    @Inject(CARD_NAME_RESOLVER_PORT) private readonly cardNameResolver: CardNameResolverPort
  ) {}

  async execute(deckId: string): Promise<CacheCardImagesResult> {
    const deck = await this.prisma.deck.findUnique({
      where: {
        id: deckId
      },
      select: {
        id: true,
        deckCards: {
          select: {
            id: true,
            originalName: true,
            card: {
              select: {
                id: true,
                ygoprodeckId: true,
                officialName: true,
                imageAssetId: true,
                imageUrlSource: true,
                imageAsset: {
                  select: {
                    id: true,
                    storagePath: true,
                    deletedAt: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!deck) {
      throw new NotFoundException("El deck indicado no existe.");
    }

    if (deck.deckCards.length === 0) {
      throw new BadRequestException("El deck no tiene cartas revisadas para cachear imagenes.");
    }

    const result: CacheCardImagesResult = {
      deckId,
      cached: [],
      alreadyCached: [],
      missing: []
    };

    const uniqueCards = await this.findOrLinkCards(deck.deckCards, result.missing);

    for (const card of uniqueCards) {
      if (card.imageAssetId && card.imageAsset && !card.imageAsset.deletedAt) {
        result.alreadyCached.push({
          cardId: card.id,
          officialName: card.officialName,
          imageAssetId: card.imageAsset.id,
          storagePath: card.imageAsset.storagePath
        });
        continue;
      }

      if (!card.imageUrlSource) {
        result.missing.push({
          cardId: card.id,
          officialName: card.officialName,
          reason: "La carta no tiene URL de imagen fuente."
        });
        continue;
      }

      try {
        const storedImage = await this.cardImageStorage.storeCardImage({
          imageUrl: card.imageUrlSource,
          ygoprodeckId: card.ygoprodeckId
        });
        const now = new Date();
        const imageAsset = await this.prisma.managedImageAsset.upsert({
          where: {
            storagePath: storedImage.storagePath
          },
          create: {
            category: ImageAssetCategory.CARD_IMAGE,
            storagePath: storedImage.storagePath,
            mimeType: storedImage.mimeType,
            sizeBytes: storedImage.sizeBytes,
            checksum: storedImage.checksum,
            retentionPolicy: RetentionPolicy.PERMANENT,
            lastUsedAt: now
          },
          update: {
            category: ImageAssetCategory.CARD_IMAGE,
            mimeType: storedImage.mimeType,
            sizeBytes: storedImage.sizeBytes,
            checksum: storedImage.checksum,
            retentionPolicy: RetentionPolicy.PERMANENT,
            lastUsedAt: now,
            deletedAt: null
          },
          select: {
            id: true,
            storagePath: true
          }
        });

        await this.prisma.card.update({
          where: {
            id: card.id
          },
          data: {
            imageAssetId: imageAsset.id,
            lastUsedAt: now
          }
        });

        result.cached.push({
          cardId: card.id,
          officialName: card.officialName,
          imageAssetId: imageAsset.id,
          storagePath: imageAsset.storagePath
        });
      } catch (error) {
        result.missing.push({
          cardId: card.id,
          officialName: card.officialName,
          reason: (error as Error).message
        });
      }
    }

    return result;
  }

  private async findOrLinkCards(
    deckCards: DeckCardForImageCache[],
    missing: MissingCardImageResultItem[]
  ): Promise<NonNullable<DeckCardForImageCache["card"]>[]> {
    const cardsById = new Map<string, NonNullable<DeckCardForImageCache["card"]>>();

    for (const deckCard of deckCards) {
      if (deckCard.card) {
        cardsById.set(deckCard.card.id, deckCard.card);
        continue;
      }

      const candidates = await this.cardNameResolver.findCandidates(deckCard.originalName);

      if (candidates.length !== 1) {
        missing.push({
          cardId: deckCard.id,
          officialName: deckCard.originalName,
          reason:
            candidates.length === 0
              ? "No se encontro la carta en YGOPRODeck usando el nombre revisado."
              : "El nombre revisado devuelve multiples coincidencias en YGOPRODeck."
        });
        continue;
      }

      await this.prisma.deckCard.update({
        where: {
          id: deckCard.id
        },
        data: {
          cardId: candidates[0].id
        }
      });

      const linkedCard = await this.prisma.card.findUnique({
        where: {
          id: candidates[0].id
        },
        select: {
          id: true,
          ygoprodeckId: true,
          officialName: true,
          imageAssetId: true,
          imageUrlSource: true,
          imageAsset: {
            select: {
              id: true,
              storagePath: true,
              deletedAt: true
            }
          }
        }
      });

      if (linkedCard) {
        cardsById.set(linkedCard.id, linkedCard);
      }
    }

    return [...cardsById.values()];
  }
}
