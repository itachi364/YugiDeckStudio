import { ImageAssetCategory } from "@prisma/client";
import { ReplaceStoreSocialLinksUseCase } from "../src/modules/stores/application/replace-store-social-links.use-case";

describe("ReplaceStoreSocialLinksUseCase", () => {
  const findStore = jest.fn();
  const deleteMany = jest.fn();
  const createMany = jest.fn();
  const findMany = jest.fn();
  const transaction = jest.fn();
  const assertAssetCategory = jest.fn();

  const useCase = new ReplaceStoreSocialLinksUseCase(
    {
      store: {
        findUnique: findStore
      },
      storeSocialLink: {
        deleteMany,
        createMany,
        findMany
      },
      $transaction: transaction
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
    deleteMany.mockReturnValue("delete-operation");
    createMany.mockReturnValue("create-operation");
    transaction.mockResolvedValue([]);
    findMany.mockResolvedValue([
      {
        id: "social-link-id",
        platform: "Instagram",
        handle: "@readyforduel"
      }
    ]);
  });

  it("replaces social links and validates social logo assets", async () => {
    const result = await useCase.execute({
      storeId: "store-id",
      links: [
        {
          platform: " Instagram ",
          handle: " @readyforduel ",
          url: "https://instagram.com/readyforduel",
          iconAssetId: "social-logo-id",
          displayOrder: 2
        }
      ]
    });

    expect(assertAssetCategory).toHaveBeenCalledWith("social-logo-id", ImageAssetCategory.SOCIAL_LOGO);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        storeId: "store-id"
      }
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          storeId: "store-id",
          platform: "Instagram",
          handle: "@readyforduel",
          url: "https://instagram.com/readyforduel",
          iconAssetId: "social-logo-id",
          displayOrder: 2,
          isActive: true
        }
      ]
    });
    expect(transaction).toHaveBeenCalledWith(["delete-operation", "create-operation"]);
    expect(result).toEqual([
      {
        id: "social-link-id",
        platform: "Instagram",
        handle: "@readyforduel"
      }
    ]);
  });
});
