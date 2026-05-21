import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DeckStatus, ImageAssetCategory, RetentionPolicy } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { LocalImageStorageService } from "../infrastructure/local-image-storage.service";
import {
  DECK_IMAGE_RENDERER_PORT,
  DeckImageRendererPort,
  RenderableDeckCard,
  RenderableSocialLink
} from "../ports/deck-image-renderer.port";
import { DeckReviewPolicyService } from "./deck-review-policy.service";

interface AssetPath {
  storagePath: string;
  deletedAt: Date | null;
}

interface MissingDeckImageDependency {
  deckCardId: string;
  originalName: string;
  reason: string;
}

export interface GenerateDeckImageResult {
  deckId: string;
  generatedImageId: string;
  imageAssetId: string;
  storagePath: string;
  width: number;
  height: number;
  mimeType: string;
  status: DeckStatus;
}

@Injectable()
export class GenerateDeckImageUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: LocalImageStorageService,
    private readonly deckReviewPolicy: DeckReviewPolicyService,
    @Inject(DECK_IMAGE_RENDERER_PORT) private readonly deckImageRenderer: DeckImageRendererPort
  ) {}

  async execute(deckId: string): Promise<GenerateDeckImageResult> {
    await this.deckReviewPolicy.assertCanGenerateImage(deckId);

    const deck = await this.findDeck(deckId);

    if (!deck) {
      throw new NotFoundException("El deck indicado no existe.");
    }

    const missingDependencies = this.findMissingDependencies(deck.deckCards);

    if (missingDependencies.length > 0) {
      throw new BadRequestException({
        message: "No se puede generar la imagen porque faltan cartas o imagenes cacheadas.",
        missingDependencies
      });
    }

    const renderedImage = await this.deckImageRenderer.render({
      playerName: deck.player.displayName,
      tournamentDate: deck.tournament.eventDate,
      resultLabel: deck.resultLabel,
      deckName: deck.deckName,
      tournamentName: deck.tournament.name ?? undefined,
      eventTypeName: deck.tournament.eventType?.name,
      tournamentTypeName: deck.tournament.tournamentType?.name,
      sourceCreditText: deck.store.sourceCreditText ?? undefined,
      backgroundColor: deck.store.backgroundColor ?? undefined,
      backgroundImagePath: this.resolveOptionalAssetPath(deck.store.backgroundImageAsset),
      primaryLogoPath: this.resolveOptionalAssetPath(deck.store.primaryLogoAsset),
      secondaryLogoPath: this.resolveOptionalAssetPath(deck.store.secondaryLogoAsset),
      eventLogoPath:
        this.resolveOptionalAssetPath(deck.tournament.eventType?.logoAsset) ??
        this.resolveOptionalAssetPath(deck.tournament.tournamentType?.logoAsset),
      socialLinks: this.buildSocialLinks(deck.store.socialLinks),
      cards: this.buildRenderableCards(deck.deckCards)
    });
    const storedImage = await this.imageStorage.saveGeneratedDeckImage(renderedImage.buffer);
    const createdImage = await this.prisma.$transaction(async (transaction) => {
      const imageAsset = await transaction.managedImageAsset.create({
        data: {
          category: ImageAssetCategory.GENERATED_DECK_IMAGE,
          storagePath: storedImage.storagePath,
          mimeType: renderedImage.mimeType,
          sizeBytes: storedImage.sizeBytes,
          checksum: storedImage.checksum,
          width: renderedImage.width,
          height: renderedImage.height,
          retentionPolicy: RetentionPolicy.TEMPORARY_CLEANUP_ALLOWED,
          lastUsedAt: new Date()
        },
        select: {
          id: true,
          storagePath: true
        }
      });

      const generatedDeckImage = await transaction.generatedDeckImage.create({
        data: {
          deckId,
          imageAssetId: imageAsset.id,
          templateName: "base-v0.1.0",
          width: renderedImage.width,
          height: renderedImage.height
        },
        select: {
          id: true
        }
      });

      const updatedDeck = await transaction.deck.update({
        where: {
          id: deckId
        },
        data: {
          status: DeckStatus.IMAGE_GENERATED
        },
        select: {
          status: true
        }
      });

      return {
        generatedImageId: generatedDeckImage.id,
        imageAssetId: imageAsset.id,
        storagePath: imageAsset.storagePath,
        status: updatedDeck.status
      };
    });

    return {
      deckId,
      generatedImageId: createdImage.generatedImageId,
      imageAssetId: createdImage.imageAssetId,
      storagePath: createdImage.storagePath,
      width: renderedImage.width,
      height: renderedImage.height,
      mimeType: renderedImage.mimeType,
      status: createdImage.status
    };
  }

  private findDeck(deckId: string) {
    return this.prisma.deck.findUnique({
      where: {
        id: deckId
      },
      select: {
        id: true,
        deckName: true,
        resultLabel: true,
        player: {
          select: {
            displayName: true
          }
        },
        tournament: {
          select: {
            name: true,
            eventDate: true,
            eventType: {
              select: {
                name: true,
                logoAsset: {
                  select: {
                    storagePath: true,
                    deletedAt: true
                  }
                }
              }
            },
            tournamentType: {
              select: {
                name: true,
                logoAsset: {
                  select: {
                    storagePath: true,
                    deletedAt: true
                  }
                }
              }
            }
          }
        },
        store: {
          select: {
            backgroundColor: true,
            sourceCreditText: true,
            primaryLogoAsset: {
              select: {
                storagePath: true,
                deletedAt: true
              }
            },
            secondaryLogoAsset: {
              select: {
                storagePath: true,
                deletedAt: true
              }
            },
            backgroundImageAsset: {
              select: {
                storagePath: true,
                deletedAt: true
              }
            },
            socialLinks: {
              where: {
                isActive: true
              },
              select: {
                platform: true,
                handle: true,
                displayOrder: true,
                iconAsset: {
                  select: {
                    storagePath: true,
                    deletedAt: true
                  }
                }
              }
            }
          }
        },
        deckCards: {
          orderBy: {
            displayOrder: "asc"
          },
          select: {
            id: true,
            section: true,
            quantity: true,
            originalName: true,
            displayOrder: true,
            card: {
              select: {
                officialName: true,
                imageAsset: {
                  select: {
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
  }

  private findMissingDependencies(
    deckCards: Array<{
      id: string;
      originalName: string;
      card: {
        officialName: string;
        imageAsset: AssetPath | null;
      } | null;
    }>
  ): MissingDeckImageDependency[] {
    return deckCards.flatMap((deckCard) => {
      if (!deckCard.card) {
        return [
          {
            deckCardId: deckCard.id,
            originalName: deckCard.originalName,
            reason: "La carta no esta resuelta."
          }
        ];
      }

      if (!deckCard.card.imageAsset || deckCard.card.imageAsset.deletedAt) {
        return [
          {
            deckCardId: deckCard.id,
            originalName: deckCard.originalName,
            reason: "La carta no tiene imagen cacheada activa."
          }
        ];
      }

      return [];
    });
  }

  private buildRenderableCards(
    deckCards: Array<{
      section: RenderableDeckCard["section"];
      quantity: number;
      displayOrder: number;
      card: {
        officialName: string;
        imageAsset: AssetPath | null;
      } | null;
    }>
  ): RenderableDeckCard[] {
    return deckCards.map((deckCard) => ({
      section: deckCard.section,
      quantity: deckCard.quantity,
      name: deckCard.card?.officialName ?? "",
      imagePath: this.imageStorage.resolveStoragePath(deckCard.card?.imageAsset?.storagePath ?? ""),
      displayOrder: deckCard.displayOrder
    }));
  }

  private buildSocialLinks(
    socialLinks: Array<{
      platform: string;
      handle: string;
      displayOrder: number;
      iconAsset: AssetPath | null;
    }>
  ): RenderableSocialLink[] {
    return socialLinks.map((socialLink) => ({
      platform: socialLink.platform,
      handle: socialLink.handle,
      displayOrder: socialLink.displayOrder,
      iconPath: this.resolveOptionalAssetPath(socialLink.iconAsset)
    }));
  }

  private resolveOptionalAssetPath(asset?: AssetPath | null): string | undefined {
    if (!asset || asset.deletedAt) {
      return undefined;
    }

    return this.imageStorage.resolveStoragePath(asset.storagePath);
  }
}
