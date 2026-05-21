import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { CardNameNormalizer } from "../domain/card-name-normalizer";
import { CardNameCandidate, CardNameResolverPort } from "../ports/card-name-resolver.port";

interface YgoprodeckCardImage {
  image_url?: string;
}

interface YgoprodeckCardResponseItem {
  id: number;
  name: string;
  type?: string;
  frameType?: string;
  card_images?: YgoprodeckCardImage[];
}

interface YgoprodeckCardInfoResponse {
  data?: YgoprodeckCardResponseItem[];
}

@Injectable()
export class YgoprodeckCardCatalogAdapter implements CardNameResolverPort {
  private readonly logger = new Logger(YgoprodeckCardCatalogAdapter.name);
  private lastRequestAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: CardNameNormalizer,
    private readonly configService: ConfigService
  ) {}

  async findCandidates(originalName: string): Promise<CardNameCandidate[]> {
    const cachedCandidates = await this.findCachedCandidates(originalName);

    if (cachedCandidates.length > 0) {
      return cachedCandidates;
    }

    const exactCandidates = await this.fetchAndCacheCandidates("name", originalName);

    if (exactCandidates.length > 0) {
      return exactCandidates;
    }

    return this.fetchAndCacheCandidates("fname", originalName);
  }

  private async findCachedCandidates(originalName: string): Promise<CardNameCandidate[]> {
    const normalizedOriginalName = this.normalizer.normalize(originalName);
    const cards = await this.prisma.card.findMany({
      select: {
        id: true,
        officialName: true
      }
    });

    return cards.filter((card) => this.normalizer.normalize(card.officialName) === normalizedOriginalName);
  }

  private async fetchAndCacheCandidates(parameter: "name" | "fname", originalName: string): Promise<CardNameCandidate[]> {
    try {
      await this.applyRateLimit();

      const url = this.buildCardInfoUrl(parameter, originalName);
      const response = await fetch(url);
      this.lastRequestAt = Date.now();

      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as YgoprodeckCardInfoResponse;
      const cards = payload.data ?? [];
      const persistedCards = [];

      for (const card of cards) {
        persistedCards.push(await this.persistCard(card));
      }

      return persistedCards;
    } catch (error) {
      this.logger.warn(`YGOPRODeck lookup failed for ${parameter}=${originalName}: ${(error as Error).message}`);
      return [];
    }
  }

  private buildCardInfoUrl(parameter: "name" | "fname", value: string): string {
    const baseUrl =
      this.configService.get<string>("YGOPRODECK_API_BASE_URL") ?? "https://db.ygoprodeck.com/api/v7";
    const url = new URL(`${baseUrl.replace(/\/$/, "")}/cardinfo.php`);
    url.searchParams.set(parameter, value);
    return url.toString();
  }

  private async persistCard(card: YgoprodeckCardResponseItem): Promise<CardNameCandidate> {
    const persistedCard = await this.prisma.card.upsert({
      where: {
        ygoprodeckId: card.id
      },
      create: {
        ygoprodeckId: card.id,
        officialName: card.name,
        cardType: card.type,
        frameType: card.frameType,
        imageUrlSource: card.card_images?.[0]?.image_url,
        rawPayloadJson: card as unknown as Prisma.InputJsonValue,
        lastUsedAt: new Date()
      },
      update: {
        officialName: card.name,
        cardType: card.type,
        frameType: card.frameType,
        imageUrlSource: card.card_images?.[0]?.image_url,
        rawPayloadJson: card as unknown as Prisma.InputJsonValue,
        lastUsedAt: new Date()
      },
      select: {
        id: true,
        officialName: true
      }
    });

    return persistedCard;
  }

  private async applyRateLimit(): Promise<void> {
    const rateLimit = Number(this.configService.get<string>("YGOPRODECK_RATE_LIMIT_PER_SECOND") ?? "20");
    const minimumInterval = Number.isFinite(rateLimit) && rateLimit > 0 ? 1000 / rateLimit : 50;
    const elapsed = Date.now() - this.lastRequestAt;
    const delay = Math.max(0, minimumInterval - elapsed);

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
