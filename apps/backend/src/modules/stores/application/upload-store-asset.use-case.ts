import { BadRequestException, Injectable } from "@nestjs/common";
import { ImageAssetCategory, RetentionPolicy } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import {
  LocalStoreAssetStorageService,
  StoreAssetFile
} from "../infrastructure/local-store-asset-storage.service";

export interface UploadStoreAssetInput {
  storeId: string;
  category: ImageAssetCategory;
  file: StoreAssetFile;
}

export interface UploadStoreAssetResult {
  imageAssetId: string;
  category: ImageAssetCategory;
  storagePath: string;
  retentionPolicy: RetentionPolicy;
}

@Injectable()
export class UploadStoreAssetUseCase {
  private readonly allowedCategories = new Set<ImageAssetCategory>([
    ImageAssetCategory.STORE_LOGO,
    ImageAssetCategory.EVENT_LOGO,
    ImageAssetCategory.SOCIAL_LOGO,
    ImageAssetCategory.BACKGROUND_IMAGE
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStoreAssetStorageService
  ) {}

  async execute(input: UploadStoreAssetInput): Promise<UploadStoreAssetResult> {
    if (!this.allowedCategories.has(input.category)) {
      throw new BadRequestException("La categoria de asset no es configurable para tienda.");
    }

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

    const storedFile = await this.storage.saveStoreAsset(input.file, input.category);
    const asset = await this.prisma.managedImageAsset.create({
      data: {
        storeId: input.storeId,
        category: input.category,
        storagePath: storedFile.storagePath,
        originalFilename: storedFile.originalFilename,
        mimeType: storedFile.mimeType,
        sizeBytes: storedFile.sizeBytes,
        checksum: storedFile.checksum,
        retentionPolicy: RetentionPolicy.PERMANENT,
        lastUsedAt: new Date()
      },
      select: {
        id: true,
        category: true,
        storagePath: true,
        retentionPolicy: true
      }
    });

    return {
      imageAssetId: asset.id,
      category: asset.category,
      storagePath: asset.storagePath,
      retentionPolicy: asset.retentionPolicy
    };
  }
}
