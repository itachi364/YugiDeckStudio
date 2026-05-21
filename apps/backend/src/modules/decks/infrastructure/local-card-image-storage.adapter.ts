import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CardImageStoragePort,
  StoreCardImageInput,
  StoredCardImage
} from "../ports/card-image-storage.port";

@Injectable()
export class LocalCardImageStorageAdapter implements CardImageStoragePort {
  constructor(private readonly configService: ConfigService) {}

  async storeCardImage(input: StoreCardImageInput): Promise<StoredCardImage> {
    const response = await fetch(input.imageUrl);

    if (!response.ok) {
      throw new BadRequestException("No se pudo descargar la imagen de la carta desde YGOPRODeck.");
    }

    const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";

    if (!mimeType.startsWith("image/")) {
      throw new BadRequestException("El recurso descargado para la carta no es una imagen.");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const storagePath = path.join("card-images", `${input.ygoprodeckId}${this.extensionForMimeType(mimeType)}`);
    const absolutePath = this.resolveInsideStorage(storagePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);

    return {
      checksum,
      mimeType,
      sizeBytes: buffer.length,
      storagePath
    };
  }

  private extensionForMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
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
