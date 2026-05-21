import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { CardNameNormalizer } from "../domain/card-name-normalizer";
import { CardNameCandidate, CardNameResolverPort } from "../ports/card-name-resolver.port";

@Injectable()
export class LocalCardCacheNameResolverAdapter implements CardNameResolverPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: CardNameNormalizer
  ) {}

  async findCandidates(originalName: string): Promise<CardNameCandidate[]> {
    const normalizedOriginalName = this.normalizer.normalize(originalName);
    const cards = await this.prisma.card.findMany({
      select: {
        id: true,
        officialName: true
      }
    });

    return cards.filter((card) => this.normalizer.normalize(card.officialName) === normalizedOriginalName);
  }
}
