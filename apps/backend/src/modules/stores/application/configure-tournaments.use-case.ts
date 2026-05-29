import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DeckStatus, ImageAssetCategory, TournamentStatus } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { AuthenticatedUserPayload } from "../../auth/ports/auth-token.port";
import { StoreAssetPolicyService } from "./store-asset-policy.service";

export interface ConfigureTournamentInput {
  storeId: string;
  tournamentId?: string;
  eventTypeId: string;
  name: string;
  description?: string | null;
  logoAssetId?: string | null;
  eventDate: string;
  location?: string | null;
  status?: TournamentStatus;
}

export interface ListTournamentsInput {
  storeId: string;
  status?: TournamentStatus;
}

export interface CloseTournamentInput {
  currentUser: AuthenticatedUserPayload;
  storeId: string;
  tournamentId: string;
  reason?: string;
}

@Injectable()
export class ConfigureTournamentsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetPolicy: StoreAssetPolicyService
  ) {}

  list(input: ListTournamentsInput) {
    return this.prisma.tournament.findMany({
      where: {
        storeId: input.storeId,
        ...(input.status ? { status: input.status } : {})
      },
      orderBy: [
        {
          eventDate: "desc"
        },
        {
          name: "asc"
        }
      ],
      include: {
        eventType: {
          select: {
            id: true,
            name: true
          }
        },
        store: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            decks: true
          }
        },
        decks: {
          where: {
            status: {
              not: DeckStatus.INACTIVE
            }
          },
          select: {
            resultLabel: true
          }
        }
      }
    });
  }

  async listVisibleForUser(user: AuthenticatedUserPayload) {
    if (!user.isRoot && !user.storeId) {
      throw new ForbiddenException("El usuario no tiene una tienda asociada.");
    }

    return this.prisma.tournament.findMany({
      where: user.isRoot ? {} : { storeId: user.storeId as string },
      orderBy: [
        {
          eventDate: "desc"
        },
        {
          name: "asc"
        }
      ],
      include: {
        eventType: {
          select: {
            id: true,
            name: true
          }
        },
        store: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            decks: true
          }
        },
        decks: {
          where: {
            status: {
              not: DeckStatus.INACTIVE
            }
          },
          select: {
            resultLabel: true
          }
        }
      }
    });
  }

  async create(input: ConfigureTournamentInput) {
    await this.assertEventBelongsToStore(input.eventTypeId, input.storeId);
    await this.assetPolicy.assertAssetCategory(input.logoAssetId, ImageAssetCategory.TOURNAMENT_LOGO, input.storeId);

    return this.prisma.tournament.create({
      data: {
        storeId: input.storeId,
        eventTypeId: input.eventTypeId,
        name: input.name.trim(),
        description: this.emptyToNull(input.description),
        logoAssetId: input.logoAssetId ?? null,
        eventDate: this.parseEventDate(input.eventDate),
        location: this.emptyToNull(input.location),
        status: TournamentStatus.OPEN
      },
      include: {
        eventType: {
          select: {
            id: true,
            name: true
          }
        },
        store: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            decks: true
          }
        },
        decks: {
          where: {
            status: {
              not: DeckStatus.INACTIVE
            }
          },
          select: {
            resultLabel: true
          }
        }
      }
    });
  }

  async update(input: ConfigureTournamentInput) {
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: input.tournamentId,
        storeId: input.storeId
      },
      select: {
        id: true,
        status: true
      }
    });

    if (!tournament) {
      throw new NotFoundException("El torneo indicado no existe para la tienda.");
    }

    await this.assertEventBelongsToStore(input.eventTypeId, input.storeId);
    await this.assetPolicy.assertAssetCategory(input.logoAssetId, ImageAssetCategory.TOURNAMENT_LOGO, input.storeId);

    return this.prisma.tournament.update({
      where: {
        id: tournament.id
      },
      data: {
        eventTypeId: input.eventTypeId,
        name: input.name.trim(),
        description: this.emptyToNull(input.description),
        logoAssetId: input.logoAssetId ?? null,
        eventDate: this.parseEventDate(input.eventDate),
        location: this.emptyToNull(input.location),
        status: tournament.status
      },
      include: {
        eventType: {
          select: {
            id: true,
            name: true
          }
        },
        store: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            decks: true
          }
        },
        decks: {
          where: {
            status: {
              not: DeckStatus.INACTIVE
            }
          },
          select: {
            resultLabel: true
          }
        }
      }
    });
  }

  async close(input: CloseTournamentInput) {
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: input.tournamentId,
        storeId: input.storeId
      },
      select: {
        id: true,
        status: true,
        decks: {
          where: {
            status: {
              not: DeckStatus.INACTIVE
            }
          },
          select: {
            resultLabel: true
          }
        }
      }
    });

    if (!tournament) {
      throw new NotFoundException("El torneo indicado no existe para la tienda.");
    }

    if (tournament.status === TournamentStatus.CLOSED) {
      return this.findTournamentForResponse(tournament.id);
    }

    if (!tournament.decks.some((deck) => deck.resultLabel === "Ganador")) {
      throw new ConflictException("El torneo solo puede cerrarse manualmente cuando existe al menos un deck Ganador.");
    }

    await this.prisma.tournament.update({
      where: {
        id: tournament.id
      },
      data: {
        status: TournamentStatus.CLOSED,
        closedAt: new Date(),
        closedByUserId: input.currentUser.sub,
        closureReason: this.emptyToNull(input.reason) ?? "MANUAL"
      }
    });

    return this.findTournamentForResponse(tournament.id);
  }

  private findTournamentForResponse(tournamentId: string) {
    return this.prisma.tournament.findUniqueOrThrow({
      where: {
        id: tournamentId
      },
      include: {
        eventType: {
          select: {
            id: true,
            name: true
          }
        },
        store: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            decks: true
          }
        },
        decks: {
          where: {
            status: {
              not: DeckStatus.INACTIVE
            }
          },
          select: {
            resultLabel: true
          }
        }
      }
    });
  }

  private async assertEventBelongsToStore(eventTypeId: string, storeId: string): Promise<void> {
    const eventType = await this.prisma.eventType.findFirst({
      where: {
        id: eventTypeId,
        storeId,
        isActive: true
      },
      select: {
        id: true
      }
    });

    if (!eventType) {
      throw new BadRequestException("El evento indicado no existe, no esta activo o no pertenece a la tienda.");
    }
  }

  private parseEventDate(value: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("La fecha del torneo debe ser una fecha valida.");
    }

    return date;
  }

  private emptyToNull(value?: string | null): string | null {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
  }
}
