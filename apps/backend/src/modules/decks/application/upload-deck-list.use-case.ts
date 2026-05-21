import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeckStatus,
  ExtractionStatus,
  ImageAssetCategory,
  RetentionPolicy,
  ReviewStatus
} from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { LocalImageStorageService } from "../infrastructure/local-image-storage.service";
import type { StoredImageFile } from "../infrastructure/local-image-storage.service";

export interface UploadDeckListFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size: number;
}

export interface UploadDeckListInput {
  storeId: string;
  playerName: string;
  tournamentDate: string;
  resultLabel: string;
  deckName: string;
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
}

@Injectable()
export class UploadDeckListUseCase {
  private readonly allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: LocalImageStorageService,
    private readonly configService: ConfigService
  ) {}

  async execute(input: UploadDeckListInput): Promise<UploadDeckListResult> {
    this.validateInput(input);

    const tournamentDate = new Date(input.tournamentDate);
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

    const storedFile = await this.imageStorage.saveUploadedDeckList(input.file);

    try {
      return await this.persistUpload(input, tournamentDate, storedFile);
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
      ["tournamentDate", input.tournamentDate],
      ["resultLabel", input.resultLabel],
      ["deckName", input.deckName]
    ];

    const missingFields = requiredFields.filter(([, value]) => typeof value !== "string" || value.trim().length === 0);

    if (missingFields.length > 0) {
      throw new BadRequestException(`Campos obligatorios faltantes: ${missingFields.map(([field]) => field).join(", ")}.`);
    }

    if (Number.isNaN(new Date(input.tournamentDate).getTime())) {
      throw new BadRequestException("La fecha del torneo debe ser una fecha válida.");
    }
  }

  private async persistUpload(
    input: UploadDeckListInput,
    tournamentDate: Date,
    storedFile: StoredImageFile
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

      const tournament = await transaction.tournament.create({
        data: {
          storeId: input.storeId,
          eventTypeId: this.emptyToUndefined(input.eventTypeId),
          tournamentTypeId: this.emptyToUndefined(input.tournamentTypeId),
          name: this.emptyToUndefined(input.tournamentName),
          eventDate: tournamentDate,
          location: this.emptyToUndefined(input.location)
        }
      });

      return transaction.deck.create({
        data: {
          playerId: player.id,
          tournamentId: tournament.id,
          storeId: input.storeId,
          deckName: input.deckName.trim(),
          resultLabel: input.resultLabel.trim(),
          uploadedImageAssetId: imageAsset.id,
          status: DeckStatus.UPLOADED,
          extractionStatus: ExtractionStatus.PENDING,
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
    });

    return {
      deckId: deck.id,
      playerId: deck.playerId,
      tournamentId: deck.tournamentId,
      uploadedImageAssetId: deck.uploadedImageAssetId,
      status: deck.status,
      extractionStatus: deck.extractionStatus,
      reviewStatus: deck.reviewStatus
    };
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
