import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ImageAssetCategory, RetentionPolicy } from "@prisma/client";
import { rm } from "node:fs/promises";
import path from "node:path";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

export interface ImageCleanupResult {
  cutoffDate: Date;
  scanned: number;
  deleted: number;
  failed: number;
  skippedUnsafePath: number;
}

@Injectable()
export class ImageCleanupService {
  private readonly logger = new Logger(ImageCleanupService.name);
  private readonly temporaryCategories = [
    ImageAssetCategory.UPLOADED_DECKLIST,
    ImageAssetCategory.GENERATED_DECK_IMAGE
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async run(referenceDate = new Date()): Promise<ImageCleanupResult> {
    const retentionDays = this.getRetentionDays();
    const cutoffDate = new Date(referenceDate);
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const candidates = await this.prisma.managedImageAsset.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          lte: cutoffDate
        },
        category: {
          in: this.temporaryCategories
        },
        retentionPolicy: RetentionPolicy.TEMPORARY_CLEANUP_ALLOWED
      },
      select: {
        id: true,
        storagePath: true
      }
    });

    const result: ImageCleanupResult = {
      cutoffDate,
      scanned: candidates.length,
      deleted: 0,
      failed: 0,
      skippedUnsafePath: 0
    };

    for (const candidate of candidates) {
      const resolvedPath = this.resolveStoragePath(candidate.storagePath);

      if (!resolvedPath) {
        result.skippedUnsafePath += 1;
        this.logger.warn(`Skipped image cleanup outside storage root: ${candidate.storagePath}`);
        continue;
      }

      try {
        await rm(resolvedPath, { force: true });
        await this.prisma.managedImageAsset.update({
          where: {
            id: candidate.id
          },
          data: {
            deletedAt: referenceDate
          }
        });
        result.deleted += 1;
      } catch (error) {
        result.failed += 1;
        this.logger.error(`Failed to clean image asset ${candidate.id}`, error as Error);
      }
    }

    this.logger.log(
      `Image cleanup finished. scanned=${result.scanned} deleted=${result.deleted} failed=${result.failed} skippedUnsafePath=${result.skippedUnsafePath}`
    );

    return result;
  }

  private getRetentionDays(): number {
    const values = [
      this.configService.get<string>("UPLOADED_DECKLIST_RETENTION_DAYS"),
      this.configService.get<string>("GENERATED_IMAGE_RETENTION_DAYS")
    ].map((value) => Number(value ?? "7"));

    const validValues = values.filter((value) => Number.isFinite(value) && value >= 1);

    if (validValues.length === 0) {
      return 7;
    }

    return Math.min(...validValues);
  }

  private resolveStoragePath(storagePath: string): string | null {
    const storageRoot = path.resolve(this.configService.get<string>("IMAGE_STORAGE_PATH") ?? "/data/images");
    const candidatePath = path.isAbsolute(storagePath)
      ? path.resolve(storagePath)
      : path.resolve(storageRoot, storagePath);

    if (candidatePath !== storageRoot && !candidatePath.startsWith(`${storageRoot}${path.sep}`)) {
      return null;
    }

    return candidatePath;
  }
}
