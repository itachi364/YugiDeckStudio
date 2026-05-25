import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ImageAssetCategory } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { AuthenticatedUserPayload } from "../../auth/ports/auth-token.port";
import { StoreAssetPolicyService } from "./store-asset-policy.service";

export interface ConfigureEventTypeInput {
  storeId: string;
  eventTypeId?: string;
  name: string;
  description?: string | null;
  logoAssetId?: string | null;
  isActive?: boolean;
}

@Injectable()
export class ConfigureEventTypesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetPolicy: StoreAssetPolicyService
  ) {}

  list(storeId: string) {
    return this.prisma.eventType.findMany({
      where: {
        storeId
      },
      orderBy: {
        name: "asc"
      }
    });
  }

  listVisibleForUser(user: AuthenticatedUserPayload) {
    if (!user.isRoot && !user.storeId) {
      throw new ForbiddenException("El usuario no tiene una tienda vinculada para consultar eventos.");
    }

    const where = user.isRoot
      ? {}
      : {
          storeId: user.storeId as string
        };

    return this.prisma.eventType.findMany({
      where,
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
  }

  async create(input: ConfigureEventTypeInput) {
    await this.assertStoreExists(input.storeId);
    await this.assetPolicy.assertAssetCategory(input.logoAssetId, ImageAssetCategory.EVENT_LOGO, input.storeId);

    return this.prisma.eventType.create({
      data: {
        storeId: input.storeId,
        name: input.name.trim(),
        description: this.emptyToNull(input.description),
        logoAssetId: input.logoAssetId ?? null,
        isActive: input.isActive ?? true
      }
    });
  }

  async update(input: ConfigureEventTypeInput) {
    const eventType = await this.prisma.eventType.findFirst({
      where: {
        id: input.eventTypeId,
        storeId: input.storeId
      },
      select: {
        id: true
      }
    });

    if (!eventType) {
      throw new NotFoundException("El tipo de evento indicado no existe para la tienda.");
    }

    await this.assetPolicy.assertAssetCategory(input.logoAssetId, ImageAssetCategory.EVENT_LOGO, input.storeId);

    return this.prisma.eventType.update({
      where: {
        id: eventType.id
      },
      data: {
        name: input.name.trim(),
        description: this.emptyToNull(input.description),
        logoAssetId: input.logoAssetId ?? null,
        isActive: input.isActive ?? true
      }
    });
  }

  async softDelete(input: { currentUser: AuthenticatedUserPayload; storeId: string; eventTypeId: string }) {
    if (!input.currentUser.isRoot && !input.currentUser.roles.includes("store_admin")) {
      throw new ForbiddenException("Solo root o administrador de tienda pueden eliminar eventos.");
    }

    const eventType = await this.prisma.eventType.findFirst({
      where: {
        id: input.eventTypeId,
        storeId: input.storeId
      },
      select: {
        id: true
      }
    });

    if (!eventType) {
      throw new NotFoundException("El evento indicado no existe para la tienda.");
    }

    return this.prisma.eventType.update({
      where: {
        id: eventType.id
      },
      data: {
        isActive: false
      }
    });
  }

  private async assertStoreExists(storeId: string): Promise<void> {
    const store = await this.prisma.store.findUnique({
      where: {
        id: storeId
      },
      select: {
        id: true
      }
    });

    if (!store) {
      throw new NotFoundException("La tienda indicada no existe.");
    }
  }

  private emptyToNull(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
