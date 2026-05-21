import { Injectable, NotFoundException } from "@nestjs/common";
import { ImageAssetCategory } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { StoreAssetPolicyService } from "./store-asset-policy.service";

export interface StoreSocialLinkInput {
  platform: string;
  handle: string;
  url?: string | null;
  iconAssetId?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ReplaceStoreSocialLinksInput {
  storeId: string;
  links: StoreSocialLinkInput[];
}

@Injectable()
export class ReplaceStoreSocialLinksUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetPolicy: StoreAssetPolicyService
  ) {}

  list(storeId: string) {
    return this.prisma.storeSocialLink.findMany({
      where: {
        storeId
      },
      orderBy: {
        displayOrder: "asc"
      }
    });
  }

  async execute(input: ReplaceStoreSocialLinksInput) {
    await this.assertStoreExists(input.storeId);
    await Promise.all(
      input.links.map((link) => this.assetPolicy.assertAssetCategory(link.iconAssetId, ImageAssetCategory.SOCIAL_LOGO))
    );

    const operations = [
      this.prisma.storeSocialLink.deleteMany({
        where: {
          storeId: input.storeId
        }
      })
    ];

    if (input.links.length > 0) {
      operations.push(
        this.prisma.storeSocialLink.createMany({
          data: input.links.map((link, index) => ({
          storeId: input.storeId,
          platform: link.platform.trim(),
          handle: link.handle.trim(),
          url: this.emptyToNull(link.url),
          iconAssetId: link.iconAssetId ?? null,
          displayOrder: link.displayOrder ?? index,
          isActive: link.isActive ?? true
          }))
        })
      );
    }

    await this.prisma.$transaction(operations);

    return this.list(input.storeId);
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
