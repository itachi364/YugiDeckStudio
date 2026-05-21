import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ReviewStatus } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

@Injectable()
export class DeckReviewPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanGenerateImage(deckId: string): Promise<void> {
    const deck = await this.prisma.deck.findUnique({
      where: {
        id: deckId
      },
      select: {
        reviewStatus: true
      }
    });

    if (!deck) {
      throw new NotFoundException("El deck indicado no existe.");
    }

    if (deck.reviewStatus !== ReviewStatus.CONFIRMED) {
      throw new ConflictException("Debe confirmar la revisión OCR antes de generar la imagen del deck.");
    }
  }
}
