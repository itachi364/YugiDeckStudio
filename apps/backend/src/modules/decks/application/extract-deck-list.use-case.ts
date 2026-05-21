import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DeckStatus, ExtractionStatus, ResolutionStatus } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { DeckListParser, ParsedDeckCard } from "../domain/deck-list-parser";
import { LocalImageStorageService } from "../infrastructure/local-image-storage.service";
import { OCR_PORT, OcrPort } from "../ports/ocr.port";

export interface ExtractDeckListResult {
  deckId: string;
  status: DeckStatus;
  extractionStatus: ExtractionStatus;
  rawOcrText: string;
  cards: ParsedDeckCard[];
}

@Injectable()
export class ExtractDeckListFromImageUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: LocalImageStorageService,
    private readonly parser: DeckListParser,
    @Inject(OCR_PORT) private readonly ocrPort: OcrPort
  ) {}

  async execute(deckId: string): Promise<ExtractDeckListResult> {
    const deck = await this.prisma.deck.findUnique({
      where: {
        id: deckId
      },
      select: {
        id: true,
        uploadedImageAsset: {
          select: {
            storagePath: true,
            deletedAt: true
          }
        },
        deckCards: {
          select: {
            id: true
          },
          take: 1
        }
      }
    });

    if (!deck) {
      throw new NotFoundException("El deck indicado no existe.");
    }

    if (deck.deckCards.length > 0) {
      throw new ConflictException("El deck ya tiene cartas extraidas y no se puede volver a ejecutar OCR.");
    }

    if (deck.uploadedImageAsset.deletedAt) {
      throw new BadRequestException("La imagen del deck list ya no esta disponible.");
    }

    const imagePath = this.imageStorage.resolveStoragePath(deck.uploadedImageAsset.storagePath);
    const rawOcrText = await this.ocrPort.extractTextFromImage(imagePath);
    const cards = this.parser.parse(rawOcrText);

    if (cards.length === 0) {
      await this.prisma.deck.update({
        where: {
          id: deckId
        },
        data: {
          rawOcrText,
          extractionStatus: ExtractionStatus.FAILED
        }
      });
      throw new BadRequestException("No se detectaron cartas en la imagen del deck list.");
    }

    await this.prisma.$transaction([
      this.prisma.deck.update({
        where: {
          id: deckId
        },
        data: {
          rawOcrText,
          extractionStatus: ExtractionStatus.EXTRACTED,
          status: DeckStatus.EXTRACTED
        }
      }),
      this.prisma.deckCard.createMany({
        data: cards.map((card) => ({
          deckId,
          section: card.section,
          quantity: card.quantity,
          originalName: card.originalName,
          displayOrder: card.displayOrder,
          resolutionStatus: ResolutionStatus.UNRESOLVED
        }))
      })
    ]);

    return {
      deckId,
      status: DeckStatus.EXTRACTED,
      extractionStatus: ExtractionStatus.EXTRACTED,
      rawOcrText,
      cards
    };
  }
}
