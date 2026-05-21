import { ConfigService } from "@nestjs/config";
import { ImageAssetCategory, RetentionPolicy } from "@prisma/client";
import { rm } from "node:fs/promises";
import path from "node:path";
import { ImageCleanupService } from "../src/modules/maintenance/application/image-cleanup.service";

jest.mock("node:fs/promises", () => ({
  rm: jest.fn()
}));

const mockedRm = jest.mocked(rm);

describe("ImageCleanupService", () => {
  const referenceDate = new Date("2026-05-21T12:00:00.000Z");
  const findMany = jest.fn();
  const update = jest.fn();

  const service = new ImageCleanupService(
    {
      managedImageAsset: {
        findMany,
        update
      }
    } as never,
    {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          GENERATED_IMAGE_RETENTION_DAYS: "7",
          IMAGE_STORAGE_PATH: "/data/images",
          UPLOADED_DECKLIST_RETENTION_DAYS: "7"
        };

        return values[key];
      })
    } as unknown as ConfigService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRm.mockResolvedValue(undefined);
    update.mockResolvedValue(undefined);
  });

  it("selects only temporary decklist and generated deck images older than the retention window", async () => {
    findMany.mockResolvedValue([]);

    await service.run(referenceDate);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        createdAt: {
          lte: new Date("2026-05-14T12:00:00.000Z")
        },
        category: {
          in: [ImageAssetCategory.UPLOADED_DECKLIST, ImageAssetCategory.GENERATED_DECK_IMAGE]
        },
        retentionPolicy: RetentionPolicy.TEMPORARY_CLEANUP_ALLOWED
      },
      select: {
        id: true,
        storagePath: true
      }
    });
  });

  it("deletes candidate files and marks them as deleted", async () => {
    findMany.mockResolvedValue([
      {
        id: "asset-1",
        storagePath: "uploads/decklist.png"
      },
      {
        id: "asset-2",
        storagePath: "/data/images/generated/deck.png"
      }
    ]);

    const result = await service.run(referenceDate);

    expect(mockedRm).toHaveBeenCalledWith(path.resolve("/data/images/uploads/decklist.png"), { force: true });
    expect(mockedRm).toHaveBeenCalledWith(path.resolve("/data/images/generated/deck.png"), { force: true });
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith({
      where: {
        id: "asset-1"
      },
      data: {
        deletedAt: referenceDate
      }
    });
    expect(result.deleted).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("skips paths outside the configured image storage root", async () => {
    findMany.mockResolvedValue([
      {
        id: "asset-1",
        storagePath: "../outside.png"
      }
    ]);

    const result = await service.run(referenceDate);

    expect(mockedRm).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(result.skippedUnsafePath).toBe(1);
  });
});
