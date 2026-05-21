import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { LocalCardImageStorageAdapter } from "../src/modules/decks/infrastructure/local-card-image-storage.adapter";

jest.mock("node:fs/promises", () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn()
}));

describe("LocalCardImageStorageAdapter", () => {
  const fetchMock = jest.fn();
  const adapter = new LocalCardImageStorageAdapter({
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        IMAGE_STORAGE_PATH: "C:\\tmp\\yugideck-images"
      };

      return values[key];
    })
  } as unknown as ConfigService);

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
  });

  it("downloads and stores card images under permanent card image paths", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    fetchMock.mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue("image/jpeg")
      },
      arrayBuffer: jest.fn().mockResolvedValue(bytes.buffer)
    });

    const result = await adapter.storeCardImage({
      imageUrl: "https://images.ygoprodeck.com/images/cards/89631139.jpg",
      ygoprodeckId: 89631139
    });

    expect(fetchMock).toHaveBeenCalledWith("https://images.ygoprodeck.com/images/cards/89631139.jpg");
    expect(mkdir).toHaveBeenCalledWith(expect.stringContaining("card-images"), { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining("card-images\\89631139.jpg"), Buffer.from(bytes));
    expect(result).toEqual({
      checksum: createHash("sha256").update(Buffer.from(bytes)).digest("hex"),
      mimeType: "image/jpeg",
      sizeBytes: 3,
      storagePath: "card-images\\89631139.jpg"
    });
  });

  it("rejects failed image downloads", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      headers: {
        get: jest.fn()
      }
    });

    await expect(
      adapter.storeCardImage({
        imageUrl: "https://images.ygoprodeck.com/images/cards/missing.jpg",
        ygoprodeckId: 1
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects non-image responses", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue("text/html")
      }
    });

    await expect(
      adapter.storeCardImage({
        imageUrl: "https://example.test/not-image",
        ygoprodeckId: 1
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
