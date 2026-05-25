import { BadRequestException } from "@nestjs/common";
import { ImageAssetCategory, RetentionPolicy } from "@prisma/client";
import { UploadStoreAssetUseCase } from "../src/modules/stores/application/upload-store-asset.use-case";

describe("UploadStoreAssetUseCase", () => {
  const findStore = jest.fn();
  const createAsset = jest.fn();
  const saveStoreAsset = jest.fn();
  const useCase = new UploadStoreAssetUseCase(
    {
      store: {
        findUnique: findStore
      },
      managedImageAsset: {
        create: createAsset
      }
    } as never,
    {
      saveStoreAsset
    } as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findStore.mockResolvedValue({
      id: "store-id"
    });
    saveStoreAsset.mockResolvedValue({
      checksum: "checksum",
      mimeType: "image/png",
      originalFilename: "logo.png",
      sizeBytes: 12,
      storagePath: "store-logos/logo.png"
    });
    createAsset.mockResolvedValue({
      id: "asset-id",
      category: ImageAssetCategory.STORE_LOGO,
      storagePath: "store-logos/logo.png",
      retentionPolicy: RetentionPolicy.PERMANENT
    });
  });

  it("stores configurable assets as permanent managed image assets", async () => {
    const file = {
      buffer: Buffer.from("image"),
      mimetype: "image/png",
      originalname: "logo.png",
      size: 12
    };

    const result = await useCase.execute({
      storeId: "store-id",
      category: ImageAssetCategory.STORE_LOGO,
      file
    });

    expect(saveStoreAsset).toHaveBeenCalledWith(file, ImageAssetCategory.STORE_LOGO);
    expect(createAsset).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeId: "store-id",
        category: ImageAssetCategory.STORE_LOGO,
        retentionPolicy: RetentionPolicy.PERMANENT,
        storagePath: "store-logos/logo.png"
      }),
      select: {
        id: true,
        category: true,
        storagePath: true,
        retentionPolicy: true
      }
    });
    expect(result).toEqual({
      imageAssetId: "asset-id",
      category: ImageAssetCategory.STORE_LOGO,
      storagePath: "store-logos/logo.png",
      retentionPolicy: RetentionPolicy.PERMANENT
    });
  });

  it("rejects non configurable asset categories", async () => {
    await expect(
      useCase.execute({
        storeId: "store-id",
        category: ImageAssetCategory.GENERATED_DECK_IMAGE,
        file: {
          buffer: Buffer.from("image"),
          mimetype: "image/png",
          size: 12
        }
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(saveStoreAsset).not.toHaveBeenCalled();
  });
});
