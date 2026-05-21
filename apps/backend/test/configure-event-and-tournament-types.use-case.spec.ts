import { NotFoundException } from "@nestjs/common";
import { ImageAssetCategory } from "@prisma/client";
import { ConfigureEventTypesUseCase } from "../src/modules/stores/application/configure-event-types.use-case";
import { ConfigureTournamentTypesUseCase } from "../src/modules/stores/application/configure-tournament-types.use-case";

describe("Store event and tournament type configuration", () => {
  const findStore = jest.fn();
  const createEventType = jest.fn();
  const findEventType = jest.fn();
  const updateEventType = jest.fn();
  const createTournamentType = jest.fn();
  const findTournamentType = jest.fn();
  const updateTournamentType = jest.fn();
  const assertAssetCategory = jest.fn();

  const prisma = {
    store: {
      findUnique: findStore
    },
    eventType: {
      create: createEventType,
      findFirst: findEventType,
      update: updateEventType,
      findMany: jest.fn()
    },
    tournamentType: {
      create: createTournamentType,
      findFirst: findTournamentType,
      update: updateTournamentType,
      findMany: jest.fn()
    }
  };
  const assetPolicy = {
    assertAssetCategory
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findStore.mockResolvedValue({
      id: "store-id"
    });
    findEventType.mockResolvedValue({
      id: "event-type-id"
    });
    findTournamentType.mockResolvedValue({
      id: "tournament-type-id"
    });
    createEventType.mockResolvedValue({
      id: "event-type-id"
    });
    updateEventType.mockResolvedValue({
      id: "event-type-id"
    });
    createTournamentType.mockResolvedValue({
      id: "tournament-type-id"
    });
    updateTournamentType.mockResolvedValue({
      id: "tournament-type-id"
    });
  });

  it("creates event types with event logo assets", async () => {
    const useCase = new ConfigureEventTypesUseCase(prisma as never, assetPolicy as never);

    await useCase.create({
      storeId: "store-id",
      name: " Regional ",
      description: "Qualifier",
      logoAssetId: "event-logo-id"
    });

    expect(assertAssetCategory).toHaveBeenCalledWith("event-logo-id", ImageAssetCategory.EVENT_LOGO);
    expect(createEventType).toHaveBeenCalledWith({
      data: {
        storeId: "store-id",
        name: "Regional",
        description: "Qualifier",
        logoAssetId: "event-logo-id",
        isActive: true
      }
    });
  });

  it("updates tournament types inside the requested store", async () => {
    const useCase = new ConfigureTournamentTypesUseCase(prisma as never, assetPolicy as never);

    await useCase.update({
      storeId: "store-id",
      tournamentTypeId: "tournament-type-id",
      name: "Local",
      logoAssetId: "event-logo-id",
      isActive: false
    });

    expect(findTournamentType).toHaveBeenCalledWith({
      where: {
        id: "tournament-type-id",
        storeId: "store-id"
      },
      select: {
        id: true
      }
    });
    expect(assertAssetCategory).toHaveBeenCalledWith("event-logo-id", ImageAssetCategory.EVENT_LOGO);
    expect(updateTournamentType).toHaveBeenCalledWith({
      where: {
        id: "tournament-type-id"
      },
      data: {
        name: "Local",
        description: null,
        logoAssetId: "event-logo-id",
        isActive: false
      }
    });
  });

  it("rejects tournament type updates outside the store", async () => {
    findTournamentType.mockResolvedValue(null);
    const useCase = new ConfigureTournamentTypesUseCase(prisma as never, assetPolicy as never);

    await expect(
      useCase.update({
        storeId: "store-id",
        tournamentTypeId: "missing",
        name: "Local"
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
