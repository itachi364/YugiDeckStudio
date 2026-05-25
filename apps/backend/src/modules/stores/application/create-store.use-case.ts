import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

export interface CreateStoreInput {
  name: string;
  backgroundColor?: string | null;
  sourceCreditText?: string | null;
}

@Injectable()
export class CreateStoreUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CreateStoreInput) {
    const name = input.name.trim();

    if (!name) {
      throw new BadRequestException("El nombre de tienda es obligatorio.");
    }

    return this.prisma.store.create({
      data: {
        name,
        backgroundColor: this.emptyToNull(input.backgroundColor),
        sourceCreditText: this.emptyToNull(input.sourceCreditText)
      },
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

  private emptyToNull(value?: string | null): string | null {
    const trimmedValue = value?.trim();

    return trimmedValue ? trimmedValue : null;
  }
}
