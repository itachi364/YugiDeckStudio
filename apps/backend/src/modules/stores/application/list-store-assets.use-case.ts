import { BadRequestException, Injectable } from "@nestjs/common";
import { ImageAssetCategory } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

const configurableCategories = new Set<ImageAssetCategory>([
  ImageAssetCategory.STORE_LOGO,
  ImageAssetCategory.EVENT_LOGO,
  ImageAssetCategory.SOCIAL_LOGO,
  ImageAssetCategory.BACKGROUND_IMAGE
]);

@Injectable()
export class ListStoreAssetsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: { storeId: string; category?: ImageAssetCategory }) {
    if (input.category && !configurableCategories.has(input.category)) {
      throw new BadRequestException("La categoria de asset no es configurable para tienda.");
    }

    return this.prisma.managedImageAsset.findMany({
      where: {
        storeId: input.storeId,
        deletedAt: null,
        ...(input.category ? { category: input.category } : {})
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
  }
}
