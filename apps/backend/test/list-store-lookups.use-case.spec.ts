import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ImageAssetCategory } from "@prisma/client";
import { ListStoreAssetsUseCase } from "../src/modules/stores/application/list-store-assets.use-case";
import { ListVisibleStoresUseCase } from "../src/modules/stores/application/list-visible-stores.use-case";

describe("Store lookup use cases", () => {
  const findManyStores = jest.fn();
  const findManyAssets = jest.fn();
  const prisma = {
    store: {
      findMany: findManyStores
    },
    managedImageAsset: {
      findMany: findManyAssets
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findManyStores.mockResolvedValue([]);
    findManyAssets.mockResolvedValue([]);
  });

  it("lists all stores for root selectors", async () => {
    const useCase = new ListVisibleStoresUseCase(prisma as never);

    await useCase.execute({
      sub: "root-id",
      username: "root",
      storeId: null,
      isRoot: true,
      mustChangePassword: false,
      roles: ["root"]
    });

    expect(findManyStores).toHaveBeenCalledWith({
      where: {},
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: "asc"
      }
    });
  });

  it("lists only the linked store for non-root selectors", async () => {
    const useCase = new ListVisibleStoresUseCase(prisma as never);

    await useCase.execute({
      sub: "operator-id",
      username: "operator",
      storeId: "store-id",
      isRoot: false,
      mustChangePassword: false,
      roles: ["operator"]
    });

    expect(findManyStores).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "store-id"
        }
      })
    );
  });

  it("rejects non-root store selectors without linked store", () => {
    const useCase = new ListVisibleStoresUseCase(prisma as never);

    expect(() =>
      useCase.execute({
        sub: "operator-id",
        username: "operator",
        storeId: null,
        isRoot: false,
        mustChangePassword: false,
        roles: ["operator"]
      })
    ).toThrow(ForbiddenException);
  });

  it("lists active configurable assets by store and category", async () => {
    const useCase = new ListStoreAssetsUseCase(prisma as never);

    await useCase.execute({
      storeId: "store-id",
      category: ImageAssetCategory.EVENT_LOGO
    });

    expect(findManyAssets).toHaveBeenCalledWith({
      where: {
        storeId: "store-id",
        deletedAt: null,
        category: ImageAssetCategory.EVENT_LOGO
      },
      select: {
        id: true,
        category: true,
        originalFilename: true,
        storagePath: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  });

  it("rejects non configurable asset categories for selectors", async () => {
    const useCase = new ListStoreAssetsUseCase(prisma as never);

    await expect(
      useCase.execute({
        storeId: "store-id",
        category: ImageAssetCategory.CARD_IMAGE
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
