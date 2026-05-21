import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UploadDeckListFile } from "../application/upload-deck-list.use-case";

export interface StoredImageFile {
  checksum: string;
  storagePath: string;
}

export interface StoredGeneratedImageFile extends StoredImageFile {
  mimeType: string;
  sizeBytes: number;
}

@Injectable()
export class LocalImageStorageService {
  constructor(private readonly configService: ConfigService) {}

  async saveUploadedDeckList(file: UploadDeckListFile): Promise<StoredImageFile> {
    const checksum = createHash("sha256").update(file.buffer).digest("hex");
    const extension = this.extensionForMimeType(file.mimetype);
    const storagePath = path.join("uploaded-decklists", `${randomUUID()}${extension}`);
    const absolutePath = this.resolveInsideStorage(storagePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      checksum,
      storagePath
    };
  }

  async saveGeneratedDeckImage(buffer: Buffer): Promise<StoredGeneratedImageFile> {
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const storagePath = path.join("generated-deck-images", `${randomUUID()}.png`);
    const absolutePath = this.resolveInsideStorage(storagePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);

    return {
      checksum,
      mimeType: "image/png",
      sizeBytes: buffer.length,
      storagePath
    };
  }

  async remove(storagePath: string): Promise<void> {
    await rm(this.resolveInsideStorage(storagePath), { force: true });
  }

  resolveStoragePath(storagePath: string): string {
    return this.resolveInsideStorage(storagePath);
  }

  private extensionForMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp"
    };

    return extensions[mimeType] ?? ".img";
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
