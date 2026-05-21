import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ImageAssetCategory } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoreAssetFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size: number;
}

export interface StoredStoreAssetFile {
  checksum: string;
  mimeType: string;
  originalFilename?: string;
  sizeBytes: number;
  storagePath: string;
}

@Injectable()
export class LocalStoreAssetStorageService {
  private readonly allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

  constructor(private readonly configService: ConfigService) {}

  async saveStoreAsset(file: StoreAssetFile, category: ImageAssetCategory): Promise<StoredStoreAssetFile> {
    this.validateFile(file);

    const checksum = createHash("sha256").update(file.buffer).digest("hex");
    const storagePath = path.join(this.folderForCategory(category), `${randomUUID()}${this.extensionForMimeType(file.mimetype)}`);
    const absolutePath = this.resolveInsideStorage(storagePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      checksum,
      mimeType: file.mimetype,
      originalFilename: file.originalname,
      sizeBytes: file.size,
      storagePath
    };
  }

  private validateFile(file: StoreAssetFile): void {
    if (!file?.buffer?.length || file.size <= 0) {
      throw new BadRequestException("La imagen configurable no puede estar vacia.");
    }

    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("La imagen configurable debe ser JPEG, PNG o WebP.");
    }

    if (file.size > this.getMaxAssetBytes()) {
      throw new BadRequestException("La imagen configurable excede el tamano maximo permitido.");
    }
  }

  private folderForCategory(category: ImageAssetCategory): string {
    const folders: Partial<Record<ImageAssetCategory, string>> = {
      [ImageAssetCategory.STORE_LOGO]: "store-logos",
      [ImageAssetCategory.EVENT_LOGO]: "event-logos",
      [ImageAssetCategory.SOCIAL_LOGO]: "social-logos",
      [ImageAssetCategory.BACKGROUND_IMAGE]: "background-images"
    };

    return folders[category] ?? "store-assets";
  }

  private extensionForMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp"
    };

    return extensions[mimeType] ?? ".img";
  }

  private getMaxAssetBytes(): number {
    const configuredValue = Number(this.configService.get<string>("STORE_ASSET_MAX_BYTES") ?? "5242880");

    if (!Number.isFinite(configuredValue) || configuredValue < 1) {
      return 5 * 1024 * 1024;
    }

    return configuredValue;
  }

  private resolveInsideStorage(storagePath: string): string {
    const storageRoot = path.resolve(this.configService.get<string>("IMAGE_STORAGE_PATH") ?? "/data/images");
    const absolutePath = path.resolve(storageRoot, storagePath);

    if (absolutePath !== storageRoot && !absolutePath.startsWith(`${storageRoot}${path.sep}`)) {
      throw new Error("Storage path is outside the configured image storage root.");
    }

    return absolutePath;
  }
}
