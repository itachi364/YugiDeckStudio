import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DeckStatus } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { SYSTEM_ROLES } from "../../auth/domain/system-roles";
import { AuthenticatedUserPayload } from "../../auth/ports/auth-token.port";
import { LocalImageStorageService } from "../infrastructure/local-image-storage.service";

export interface InactivateDeckInput {
  deckId: string;
  user: AuthenticatedUserPayload;
  reason?: string;
}

export interface InactivateDeckResult {
  deckId: string;
  status: DeckStatus;
  inactiveByUserId: string;
  inactivityReason?: string;
  removedImageStoragePaths: string[];
}

interface ManagedAssetReference {
  id: string;
  storagePath: string;
  deletedAt: Date | null;
}

@Injectable()
export class InactivateDeckUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: LocalImageStorageService
  ) {}

  async execute(input: InactivateDeckInput): Promise<InactivateDeckResult> {
    this.assertCanInactivate(input.user);

    const deck = await this.prisma.deck.findUnique({
      where: {
        id: input.deckId
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
      throw new NotFoundException("El deck indicado no existe.");
    }

    if (deck.status === DeckStatus.INACTIVE) {
      throw new ConflictException("El deck ya esta inactivo.");
    }

    if (deck.status !== DeckStatus.IMAGE_GENERATED) {
      throw new ConflictException("Solo se puede inactivar un deck despues de generar su imagen.");
    }

    const removableAssets = this.collectRemovableAssets(
      deck.uploadedImageAsset,
      deck.generatedImages.map((generatedImage) => generatedImage.imageAsset)
    );
    const now = new Date();
    const reason = input.reason?.trim() || undefined;

    const updatedDeck = await this.prisma.$transaction(async (transaction) => {
      await transaction.managedImageAsset.updateMany({
        where: {
          id: {
            in: removableAssets.map((asset) => asset.id)
          }
        },
        data: {
          deletedAt: now
        }
      });

      return transaction.deck.update({
        where: {
          id: input.deckId
        },
        data: {
          status: DeckStatus.INACTIVE,
          inactiveAt: now,
          inactiveByUserId: input.user.sub,
          inactivityReason: reason
        },
        select: {
          id: true,
          status: true,
          inactiveByUserId: true,
          inactivityReason: true
        }
      });
    });

    for (const asset of removableAssets) {
      await this.imageStorage.remove(asset.storagePath);
    }

    return {
      deckId: updatedDeck.id,
      status: updatedDeck.status,
      inactiveByUserId: updatedDeck.inactiveByUserId ?? input.user.sub,
      inactivityReason: updatedDeck.inactivityReason ?? undefined,
      removedImageStoragePaths: removableAssets.map((asset) => asset.storagePath)
    };
  }

  private assertCanInactivate(user: AuthenticatedUserPayload): void {
    if (user.isRoot) {
      return;
    }

    if (!user.roles.includes(SYSTEM_ROLES.STORE_ADMIN)) {
      throw new ForbiddenException("Solo root o administrador de tienda pueden inactivar decks.");
    }
  }

  private collectRemovableAssets(
    uploadedImageAsset: ManagedAssetReference,
    generatedImageAssets: ManagedAssetReference[]
  ): ManagedAssetReference[] {
    const assetsById = new Map<string, ManagedAssetReference>();

    for (const asset of [uploadedImageAsset, ...generatedImageAssets]) {
      if (!asset.deletedAt) {
        assetsById.set(asset.id, asset);
      }
    }

    return [...assetsById.values()];
  }
}
