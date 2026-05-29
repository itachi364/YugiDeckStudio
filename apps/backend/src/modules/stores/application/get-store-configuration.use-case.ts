import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

@Injectable()
export class GetStoreConfigurationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: {
        id: storeId
      },
      select: {
        id: true,
        name: true,
        primaryLogoAssetId: true,
        secondaryLogoAssetId: true,
        backgroundImageAssetId: true,
        backgroundColor: true,
        sourceCreditText: true,
        socialLinks: {
          orderBy: {
            displayOrder: "asc"
          }
        },
        eventTypes: {
          orderBy: {
            name: "asc"
          }
        },
        tournamentTypes: {
          orderBy: {
            name: "asc"
          }
        },
        tournaments: {
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
            }
          }
        }
      }
    });

    if (!store) {
      throw new NotFoundException("La tienda indicada no existe.");
    }

    return store;
  }
}
