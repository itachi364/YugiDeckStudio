import { BadRequestException, Injectable } from "@nestjs/common";
import { ImageAssetCategory } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

@Injectable()
export class StoreAssetPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAssetCategory(
    assetId: string | null | undefined,
    expectedCategory: ImageAssetCategory,
    storeId?: string
  ): Promise<void> {
    if (!assetId) {
      return;
    }

    const asset = await this.prisma.managedImageAsset.findUnique({
      where: {
        id: assetId
      },
      select: {
        category: true,
        deletedAt: true,
        storeId: true
      }
    });

    if (!asset || asset.deletedAt) {
      throw new BadRequestException("El asset configurable indicado no existe o no esta activo.");
    }

    if (asset.category !== expectedCategory) {
      throw new BadRequestException(`El asset indicado debe ser de categoria ${expectedCategory}.`);
    }

    if (storeId && asset.storeId !== storeId) {
      throw new BadRequestException("El asset configurable indicado no pertenece a la tienda.");
    }
  }
}
