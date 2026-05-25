import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ImageAssetCategory } from "@prisma/client";
import { ConfigureEventTypesUseCase } from "../src/modules/stores/application/configure-event-types.use-case";
import { ConfigureTournamentTypesUseCase } from "../src/modules/stores/application/configure-tournament-types.use-case";

describe("Store event and tournament type configuration", () => {
  const findStore = jest.fn();
  const createEventType = jest.fn();
  const findEventType = jest.fn();
  const findManyEventTypes = jest.fn();
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
      findMany: findManyEventTypes
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
    findManyEventTypes.mockResolvedValue([]);
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

    expect(assertAssetCategory).toHaveBeenCalledWith("event-logo-id", ImageAssetCategory.EVENT_LOGO, "store-id");
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

  it("lists all visible event types for root", async () => {
    const useCase = new ConfigureEventTypesUseCase(prisma as never, assetPolicy as never);

    await useCase.listVisibleForUser({
      sub: "root-id",
      username: "root",
      storeId: null,
      isRoot: true,
      mustChangePassword: false,
      roles: ["root"]
    });

    expect(findManyEventTypes).toHaveBeenCalledWith({
      where: {},
      include: {
        store: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        {
          store: {
            name: "asc"
          }
        },
        {
          name: "asc"
        }
      ]
    });
  });

  it("lists only store scoped event types for non-root users", async () => {
    const useCase = new ConfigureEventTypesUseCase(prisma as never, assetPolicy as never);

    await useCase.listVisibleForUser({
      sub: "operator-id",
      username: "operator",
      storeId: "store-id",
      isRoot: false,
      mustChangePassword: false,
      roles: ["operator"]
    });

    expect(findManyEventTypes).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storeId: "store-id"
        }
      })
    );
  });

  it("rejects visible event listing when a non-root user has no store", async () => {
    const useCase = new ConfigureEventTypesUseCase(prisma as never, assetPolicy as never);

    expect(() =>
      useCase.listVisibleForUser({
        sub: "operator-id",
        username: "operator",
        storeId: null,
        isRoot: false,
        mustChangePassword: false,
        roles: ["operator"]
      })
    ).toThrow(ForbiddenException);
  });

  it("blocks event soft delete for operators", async () => {
    const useCase = new ConfigureEventTypesUseCase(prisma as never, assetPolicy as never);

    await expect(
      useCase.softDelete({
        currentUser: {
          sub: "operator-id",
          username: "operator",
          storeId: "store-id",
          isRoot: false,
          mustChangePassword: false,
          roles: ["operator"]
        },
        storeId: "store-id",
        eventTypeId: "event-type-id"
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("soft deletes event types for store admins", async () => {
    const useCase = new ConfigureEventTypesUseCase(prisma as never, assetPolicy as never);

    await useCase.softDelete({
      currentUser: {
        sub: "admin-id",
        username: "admin",
        storeId: "store-id",
        isRoot: false,
        mustChangePassword: false,
        roles: ["store_admin"]
      },
      storeId: "store-id",
      eventTypeId: "event-type-id"
    });

    expect(findEventType).toHaveBeenCalledWith({
      where: {
        id: "event-type-id",
        storeId: "store-id"
      },
      select: {
        id: true
      }
    });
    expect(updateEventType).toHaveBeenCalledWith({
      where: {
        id: "event-type-id"
      },
      data: {
        isActive: false
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
    expect(assertAssetCategory).toHaveBeenCalledWith("event-logo-id", ImageAssetCategory.EVENT_LOGO, "store-id");
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
