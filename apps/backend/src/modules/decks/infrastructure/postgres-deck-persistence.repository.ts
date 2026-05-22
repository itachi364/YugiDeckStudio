import { Injectable } from "@nestjs/common";
import { DeckStatus } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import {
  DeckInactivationSnapshot,
  DeckPersistenceRepository,
  DeckReviewSnapshot,
  MarkDeckInactiveInput,
  MarkDeckInactiveResult
} from "../ports/deck-persistence.repository";

@Injectable()
export class PostgresDeckPersistenceRepository implements DeckPersistenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findReviewSnapshot(deckId: string): Promise<DeckReviewSnapshot | null> {
    return this.prisma.deck.findUnique({
      where: {
        id: deckId
      },
      select: {
        reviewStatus: true
      }
    });
  }

  async findInactivationSnapshot(deckId: string): Promise<DeckInactivationSnapshot | null> {
    const deck = await this.prisma.deck.findUnique({
      where: {
        id: deckId
      },
      select: {
        id: true,
        status: true,
        uploadedImageAsset: {
          select: {
            id: true,
            storagePath: true,
            deletedAt: true
          }
        },
        generatedImages: {
          select: {
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
    });

    if (!deck) {
      return null;
    }

    return {
      id: deck.id,
      status: deck.status,
      uploadedImageAsset: deck.uploadedImageAsset,
      generatedImageAssets: deck.generatedImages.map((generatedImage) => generatedImage.imageAsset)
    };
  }

  markDeckInactive(input: MarkDeckInactiveInput): Promise<MarkDeckInactiveResult> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.managedImageAsset.updateMany({
        where: {
          id: {
            in: input.removableAssetIds
          }
        },
        data: {
          deletedAt: input.inactiveAt
        }
      });

      return transaction.deck.update({
        where: {
          id: input.deckId
        },
        data: {
          status: DeckStatus.INACTIVE,
          inactiveAt: input.inactiveAt,
          inactiveByUserId: input.inactiveByUserId,
          inactivityReason: input.inactivityReason
        },
        select: {
          id: true,
          status: true,
          inactiveByUserId: true,
          inactivityReason: true
        }
      });
    });
  }
}
