import { Injectable, NotFoundException } from "@nestjs/common";
import { ImageAssetCategory, Prisma } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { StoreAssetPolicyService } from "./store-asset-policy.service";

export interface UpdateStoreConfigurationInput {
  storeId: string;
  name?: string;
  primaryLogoAssetId?: string | null;
  secondaryLogoAssetId?: string | null;
  backgroundImageAssetId?: string | null;
  backgroundColor?: string | null;
  sourceCreditText?: string | null;
}

@Injectable()
export class UpdateStoreConfigurationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetPolicy: StoreAssetPolicyService
  ) {}

  async execute(input: UpdateStoreConfigurationInput) {
    const store = await this.prisma.store.findUnique({
      where: {
        id: input.storeId
      },
      select: {
        id: true
      }
    });

    if (!store) {
      throw new NotFoundException("La tienda indicada no existe.");
    }

    await Promise.all([
      this.assetPolicy.assertAssetCategory(input.primaryLogoAssetId, ImageAssetCategory.STORE_LOGO, input.storeId),
      this.assetPolicy.assertAssetCategory(input.secondaryLogoAssetId, ImageAssetCategory.STORE_LOGO, input.storeId),
      this.assetPolicy.assertAssetCategory(input.backgroundImageAssetId, ImageAssetCategory.BACKGROUND_IMAGE, input.storeId)
    ]);

    return this.prisma.store.update({
      where: {
        id: input.storeId
      },
      data: this.buildUpdateData(input),
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
  }

  private buildUpdateData(input: UpdateStoreConfigurationInput): Prisma.StoreUpdateInput {
    const data: Prisma.StoreUpdateInput = {};

    if (input.name !== undefined) {
      data.name = input.name.trim();
    }

    if (input.primaryLogoAssetId !== undefined) {
      data.primaryLogoAsset = input.primaryLogoAssetId
        ? { connect: { id: input.primaryLogoAssetId } }
        : { disconnect: true };
    }

    if (input.secondaryLogoAssetId !== undefined) {
      data.secondaryLogoAsset = input.secondaryLogoAssetId
        ? { connect: { id: input.secondaryLogoAssetId } }
        : { disconnect: true };
    }

    if (input.backgroundImageAssetId !== undefined) {
      data.backgroundImageAsset = input.backgroundImageAssetId
        ? { connect: { id: input.backgroundImageAssetId } }
        : { disconnect: true };
    }

    if (input.backgroundColor !== undefined) {
      data.backgroundColor = input.backgroundColor;
    }

    if (input.sourceCreditText !== undefined) {
      data.sourceCreditText = input.sourceCreditText;
    }

    return data;
  }
}
