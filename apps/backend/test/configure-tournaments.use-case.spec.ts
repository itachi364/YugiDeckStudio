import { ConflictException } from "@nestjs/common";
import { TournamentStatus } from "@prisma/client";
import { ConfigureTournamentsUseCase } from "../src/modules/stores/application/configure-tournaments.use-case";

describe("ConfigureTournamentsUseCase", () => {
  const tournamentFindMany = jest.fn();
  const tournamentCreate = jest.fn();
  const tournamentFindFirst = jest.fn();
  const tournamentUpdate = jest.fn();
  const tournamentFindUniqueOrThrow = jest.fn();
  const eventTypeFindFirst = jest.fn();
  const assertAssetCategory = jest.fn();

  const useCase = new ConfigureTournamentsUseCase(
    {
      tournament: {
        findMany: tournamentFindMany,
        create: tournamentCreate,
        findFirst: tournamentFindFirst,
        update: tournamentUpdate,
        findUniqueOrThrow: tournamentFindUniqueOrThrow
      },
      eventType: {
        findFirst: eventTypeFindFirst
      }
    } as never,
    {
      assertAssetCategory
    } as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
    eventTypeFindFirst.mockResolvedValue({ id: "event-type-id" });
    tournamentCreate.mockResolvedValue({ id: "tournament-id", status: TournamentStatus.OPEN });
    tournamentUpdate.mockResolvedValue({ id: "tournament-id", status: TournamentStatus.CLOSED });
    tournamentFindUniqueOrThrow.mockResolvedValue({ id: "tournament-id", status: TournamentStatus.CLOSED });
  });

  it("creates tournaments as open and associates a tournament logo asset", async () => {
    await useCase.create({
      storeId: "store-id",
      eventTypeId: "event-type-id",
      name: "Torneo Mes de Abril",
      description: "Top local",
      logoAssetId: "logo-id",
      eventDate: "2026-05-21",
      location: "Bogota",
      status: TournamentStatus.CLOSED
    });

    expect(assertAssetCategory).toHaveBeenCalledWith("logo-id", "TOURNAMENT_LOGO", "store-id");
    expect(tournamentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: "store-id",
          eventTypeId: "event-type-id",
          name: "Torneo Mes de Abril",
          description: "Top local",
          logoAssetId: "logo-id",
          location: "Bogota",
          status: TournamentStatus.OPEN
        })
      })
    );
  });

  it("keeps status changes inside the close operation", async () => {
    tournamentFindFirst.mockResolvedValue({
      id: "tournament-id",
      status: TournamentStatus.OPEN
    });

    await useCase.update({
      storeId: "store-id",
      tournamentId: "tournament-id",
      eventTypeId: "event-type-id",
      name: "Torneo actualizado",
      eventDate: "2026-05-21",
      status: TournamentStatus.CLOSED
    });

    expect(tournamentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: TournamentStatus.OPEN
        })
      })
    );
  });

  it("closes a tournament manually when a winner deck exists", async () => {
    tournamentFindFirst.mockResolvedValue({
      id: "tournament-id",
      status: TournamentStatus.OPEN,
      decks: [{ resultLabel: "Ganador" }]
    });

    await useCase.close({
      currentUser: {
        sub: "admin-id",
        username: "admin",
        storeId: "store-id",
        isRoot: false,
        mustChangePassword: false,
        roles: ["store_admin"]
      },
      storeId: "store-id",
      tournamentId: "tournament-id"
    });

    expect(tournamentUpdate).toHaveBeenCalledWith({
      where: {
        id: "tournament-id"
      },
      data: expect.objectContaining({
        status: TournamentStatus.CLOSED,
        closedByUserId: "admin-id",
        closureReason: "MANUAL"
      })
    });
  });

  it("rejects manual closure until a winner deck exists", async () => {
    tournamentFindFirst.mockResolvedValue({
      id: "tournament-id",
      status: TournamentStatus.OPEN,
      decks: [{ resultLabel: "Top 8" }]
    });

    await expect(
      useCase.close({
        currentUser: {
          sub: "admin-id",
          username: "admin",
          storeId: "store-id",
          isRoot: false,
          mustChangePassword: false,
          roles: ["store_admin"]
        },
        storeId: "store-id",
        tournamentId: "tournament-id"
      })
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tournamentUpdate).not.toHaveBeenCalled();
  });
});
