import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeckStatus,
  ExtractionStatus,
  ImageAssetCategory,
  RetentionPolicy,
  ResolutionStatus,
  ReviewStatus,
  TournamentStatus,
  Prisma
} from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { LocalImageStorageService } from "../infrastructure/local-image-storage.service";
import type { StoredImageFile } from "../infrastructure/local-image-storage.service";
import {
  ImportedNeuronDeck,
  NEURON_DECK_IMPORT_PORT,
  NeuronDeckImportPort
} from "../ports/neuron-deck-import.port";

export interface UploadDeckListFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size: number;
}

export interface UploadDeckListInput {
  storeId: string;
  playerName: string;
  tournamentDate?: string;
  tournamentId: string;
  resultLabel: string;
  deckName: string;
  neuronDeckUrl: string;
  tournamentName?: string;
  eventTypeId?: string;
  tournamentTypeId?: string;
  location?: string;
  file: UploadDeckListFile;
}

export interface UploadDeckListResult {
  deckId: string;
  playerId: string;
  tournamentId: string;
  uploadedImageAssetId: string;
  status: DeckStatus;
  extractionStatus: ExtractionStatus;
  reviewStatus: ReviewStatus;
  importedCardCount: number;
  tournamentStatus: TournamentStatus;
}

@Injectable()
export class UploadDeckListUseCase {
  private readonly allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  private readonly allowedResultLabels = new Set(["Ganador", "Segundo Puesto", "Top 3 - 4", "Top 8"]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: LocalImageStorageService,
    private readonly configService: ConfigService,
    @Inject(NEURON_DECK_IMPORT_PORT) private readonly neuronDeckImport: NeuronDeckImportPort
  ) {}

  async execute(input: UploadDeckListInput): Promise<UploadDeckListResult> {
    this.validateInput(input);

    const store = await this.prisma.store.findUnique({
      where: {
        id: input.storeId
      },
      select: {
        id: true
      }
    });

    if (!store) {
      throw new BadRequestException("La tienda indicada no existe.");
    }

    await this.assertTournamentCanReceiveDeck(input.storeId, input.tournamentId);

    const importedDeck = await this.neuronDeckImport.importDeck(input.neuronDeckUrl);
    const storedFile = await this.imageStorage.saveUploadedDeckList(input.file);

    try {
      return await this.persistUpload(input, storedFile, importedDeck);
    } catch (error) {
      await this.imageStorage.remove(storedFile.storagePath);
      throw error;
    }
  }

  async assertDeckListCanBeUploaded(deckId: string): Promise<void> {
    const deck = await this.prisma.deck.findUnique({
      where: {
        id: deckId
      },
      select: {
        uploadedImageAssetId: true
      }
    });

    if (deck?.uploadedImageAssetId) {
      throw new ConflictException("El deck ya tiene una imagen de deck list cargada y no puede reemplazarse.");
    }
  }

  private validateInput(input: UploadDeckListInput): void {
    if (!input.file) {
      throw new BadRequestException("La imagen del deck list es obligatoria.");
    }

    if (!this.allowedMimeTypes.has(input.file.mimetype)) {
      throw new BadRequestException("El archivo debe ser una imagen JPEG, PNG o WebP.");
    }

    if (!input.file.buffer?.length || input.file.size <= 0) {
      throw new BadRequestException("La imagen del deck list no puede estar vacía.");
    }

    if (input.file.size > this.getMaxUploadBytes()) {
      throw new BadRequestException("La imagen del deck list excede el tamaño máximo permitido.");
    }

    const requiredFields = [
      ["storeId", input.storeId],
      ["playerName", input.playerName],
      ["tournamentId", input.tournamentId],
      ["resultLabel", input.resultLabel],
      ["deckName", input.deckName],
      ["neuronDeckUrl", input.neuronDeckUrl]
    ];

    const missingFields = requiredFields.filter(([, value]) => typeof value !== "string" || value.trim().length === 0);

    if (missingFields.length > 0) {
      throw new BadRequestException(`Campos obligatorios faltantes: ${missingFields.map(([field]) => field).join(", ")}.`);
    }

    if (input.tournamentDate && Number.isNaN(new Date(input.tournamentDate).getTime())) {
      throw new BadRequestException("La fecha del torneo debe ser una fecha válida.");
    }

    if (!this.allowedResultLabels.has(input.resultLabel.trim())) {
      throw new BadRequestException("El resultado del torneo debe ser Ganador, Segundo Puesto, Top 3 - 4 o Top 8.");
    }
  }

  private async assertTournamentCanReceiveDeck(storeId: string, tournamentId: string): Promise<void> {
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        storeId
      },
      select: {
        id: true,
        status: true
      }
    });

    if (!tournament) {
      throw new BadRequestException("El torneo indicado no existe para la tienda.");
    }

    if (tournament.status === TournamentStatus.CLOSED) {
      throw new ConflictException("El torneo indicado ya esta cerrado y no permite cargar mas decks.");
    }
  }

  private async persistUpload(
    input: UploadDeckListInput,
    storedFile: StoredImageFile,
    importedDeck: ImportedNeuronDeck
  ): Promise<UploadDeckListResult> {
    const deck = await this.prisma.$transaction(async (transaction) => {
      const imageAsset = await transaction.managedImageAsset.create({
        data: {
          category: ImageAssetCategory.UPLOADED_DECKLIST,
          storagePath: storedFile.storagePath,
          originalFilename: input.file.originalname,
          mimeType: input.file.mimetype,
          sizeBytes: input.file.size,
          checksum: storedFile.checksum,
          retentionPolicy: RetentionPolicy.TEMPORARY_CLEANUP_ALLOWED,
          lastUsedAt: new Date()
        }
      });

      const player = await transaction.player.create({
        data: {
          displayName: input.playerName.trim()
        }
      });

      const createdDeck = await transaction.deck.create({
        data: {
          playerId: player.id,
          tournamentId: input.tournamentId,
          storeId: input.storeId,
          deckName: input.deckName.trim(),
          resultLabel: input.resultLabel.trim(),
          uploadedImageAssetId: imageAsset.id,
          neuronDeckUrl: importedDeck.sourceUrl,
          status: DeckStatus.EXTRACTED,
          extractionStatus: ExtractionStatus.EXTRACTED,
          reviewStatus: ReviewStatus.PENDING
        },
        select: {
          id: true,
          playerId: true,
          tournamentId: true,
          uploadedImageAssetId: true,
          status: true,
          extractionStatus: true,
          reviewStatus: true
        }
      });

      await transaction.deckCard.createMany({
        data: importedDeck.cards.map((card) => ({
          deckId: createdDeck.id,
          section: card.section,
          quantity: card.quantity,
          originalName: card.originalName,
          displayOrder: card.displayOrder,
          resolutionStatus: ResolutionStatus.UNRESOLVED
        }))
      });

      const tournamentStatus = await this.closeTournamentAutomaticallyIfComplete(transaction, input.tournamentId);

      return {
        ...createdDeck,
        tournamentStatus
      };
    });

    return {
      deckId: deck.id,
      playerId: deck.playerId,
      tournamentId: deck.tournamentId,
      uploadedImageAssetId: deck.uploadedImageAssetId,
      status: deck.status,
      extractionStatus: deck.extractionStatus,
      reviewStatus: deck.reviewStatus,
      importedCardCount: importedDeck.cards.length,
      tournamentStatus: deck.tournamentStatus
    };
  }

  private async closeTournamentAutomaticallyIfComplete(
    transaction: Prisma.TransactionClient,
    tournamentId: string
  ): Promise<TournamentStatus> {
    const tournament = await transaction.tournament.findUniqueOrThrow({
      where: {
        id: tournamentId
      },
      select: {
        status: true,
        decks: {
          where: {
            status: {
              not: DeckStatus.INACTIVE
            }
          },
          select: {
            resultLabel: true
          }
        }
      }
    });

    if (tournament.status === TournamentStatus.CLOSED || !this.isTopCutComplete(tournament.decks.map((deck) => deck.resultLabel))) {
      return tournament.status;
    }

    const updatedTournament = await transaction.tournament.update({
      where: {
        id: tournamentId
      },
      data: {
        status: TournamentStatus.CLOSED,
        closedAt: new Date(),
        closureReason: "AUTO_TOP_CUT_COMPLETE"
      },
      select: {
        status: true
      }
    });

    return updatedTournament.status;
  }

  private isTopCutComplete(resultLabels: string[]): boolean {
    if (resultLabels.length !== 8) {
      return false;
    }

    const counts = resultLabels.reduce<Record<string, number>>((accumulator, resultLabel) => {
      accumulator[resultLabel] = (accumulator[resultLabel] ?? 0) + 1;
      return accumulator;
    }, {});

    return (
      counts.Ganador === 1 &&
      counts["Segundo Puesto"] === 1 &&
      counts["Top 3 - 4"] === 2 &&
      counts["Top 8"] === 4
    );
  }

  private emptyToUndefined(value?: string): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private getMaxUploadBytes(): number {
    const configuredValue = Number(this.configService.get<string>("UPLOADED_DECKLIST_MAX_BYTES") ?? "10485760");

    if (!Number.isFinite(configuredValue) || configuredValue < 1) {
      return 10 * 1024 * 1024;
    }

    return configuredValue;
  }
}
