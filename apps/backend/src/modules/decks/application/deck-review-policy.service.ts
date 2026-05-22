import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ReviewStatus } from "@prisma/client";
import {
  DECK_PERSISTENCE_REPOSITORY,
  DeckPersistenceRepository
} from "../ports/deck-persistence.repository";

@Injectable()
export class DeckReviewPolicyService {
  constructor(
    @Inject(DECK_PERSISTENCE_REPOSITORY) private readonly deckRepository: DeckPersistenceRepository
  ) {}

  async assertCanGenerateImage(deckId: string): Promise<void> {
    const deck = await this.deckRepository.findReviewSnapshot(deckId);

    if (!deck) {
      throw new NotFoundException("El deck indicado no existe.");
    }

    if (deck.reviewStatus !== ReviewStatus.CONFIRMED) {
      throw new ConflictException("Debe confirmar la revisión OCR antes de generar la imagen del deck.");
    }
  }
}
