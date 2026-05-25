import { BadRequestException } from "@nestjs/common";
import { CreateStoreUseCase } from "../src/modules/stores/application/create-store.use-case";

describe("CreateStoreUseCase", () => {
  const createStore = jest.fn();
  const useCase = new CreateStoreUseCase({
    store: {
      create: createStore
    }
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    createStore.mockResolvedValue({
      id: "store-id",
      name: "Ready For Duel",
      primaryLogoAssetId: null,
      secondaryLogoAssetId: null,
      backgroundImageAssetId: null,
      backgroundColor: "#10131a",
      sourceCreditText: "Source: ReadyForDuel"
    });
  });

  it("creates a store without requiring an existing store selection", async () => {
    const result = await useCase.execute({
      name: " Ready For Duel ",
      backgroundColor: "#10131a",
      sourceCreditText: " Source: ReadyForDuel "
    });

    expect(createStore).toHaveBeenCalledWith({
      data: {
        name: "Ready For Duel",
        backgroundColor: "#10131a",
        sourceCreditText: "Source: ReadyForDuel"
      },
      select: {
        id: true,
        name: true,
        primaryLogoAssetId: true,
        secondaryLogoAssetId: true,
        backgroundImageAssetId: true,
        backgroundColor: true,
        sourceCreditText: true
      }
    });
    expect(result.id).toBe("store-id");
  });

  it("rejects empty store names", async () => {
    await expect(
      useCase.execute({
        name: " "
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createStore).not.toHaveBeenCalled();
  });
});
