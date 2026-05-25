import { NotFoundException } from "@nestjs/common";
import { ImageAssetCategory } from "@prisma/client";
import { UpdateStoreConfigurationUseCase } from "../src/modules/stores/application/update-store-configuration.use-case";

describe("UpdateStoreConfigurationUseCase", () => {
  const findStore = jest.fn();
  const updateStore = jest.fn();
  const assertAssetCategory = jest.fn();
  const useCase = new UpdateStoreConfigurationUseCase(
    {
      store: {
        findUnique: findStore,
        update: updateStore
      }
    } as never,
    {
      assertAssetCategory
    } as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findStore.mockResolvedValue({
      id: "store-id"
    });
    updateStore.mockResolvedValue({
      id: "store-id",
      name: "Ready For Duel",
      primaryLogoAssetId: "logo-1",
      secondaryLogoAssetId: null,
      backgroundImageAssetId: "background-1",
      backgroundColor: "#10131a",
      sourceCreditText: "ReadyForDuel"
    });
  });

  it("updates branding and validates asset categories", async () => {
    const result = await useCase.execute({
      storeId: "store-id",
      name: " Ready For Duel ",
      primaryLogoAssetId: "logo-1",
      backgroundImageAssetId: "background-1",
      backgroundColor: "#10131a",
      sourceCreditText: "ReadyForDuel"
    });

    expect(assertAssetCategory).toHaveBeenCalledWith("logo-1", ImageAssetCategory.STORE_LOGO, "store-id");
    expect(assertAssetCategory).toHaveBeenCalledWith(undefined, ImageAssetCategory.STORE_LOGO, "store-id");
    expect(assertAssetCategory).toHaveBeenCalledWith("background-1", ImageAssetCategory.BACKGROUND_IMAGE, "store-id");
    expect(updateStore).toHaveBeenCalledWith({
      where: {
        id: "store-id"
      },
      data: expect.objectContaining({
        name: "Ready For Duel",
        primaryLogoAsset: {
          connect: {
            id: "logo-1"
          }
        },
        backgroundImageAsset: {
          connect: {
            id: "background-1"
          }
        },
        backgroundColor: "#10131a",
        sourceCreditText: "ReadyForDuel"
      }),
      select: expect.any(Object)
    });
    expect(result.id).toBe("store-id");
  });

  it("rejects missing stores", async () => {
    findStore.mockResolvedValue(null);

    await expect(
      useCase.execute({
        storeId: "missing-store",
        name: "Store"
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
