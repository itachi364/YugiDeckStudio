import { BadRequestException, Injectable } from "@nestjs/common";
import { DeckSection } from "@prisma/client";

export interface DeckCompositionCard {
  id?: string;
  section: DeckSection;
  quantity: number;
  originalName?: string;
  cardId?: string | null;
}

export interface DeckCompositionTotals {
  main: number;
  extra: number;
  side: number;
}

@Injectable()
export class DeckCompositionPolicyService {
  calculateTotals(cards: DeckCompositionCard[]): DeckCompositionTotals {
    return cards.reduce<DeckCompositionTotals>(
      (totals, card) => {
        if (card.section === DeckSection.MAIN) {
          totals.main += card.quantity;
        }

        if (card.section === DeckSection.EXTRA) {
          totals.extra += card.quantity;
        }

        if (card.section === DeckSection.SIDE) {
          totals.side += card.quantity;
        }

        return totals;
      },
      {
        main: 0,
        extra: 0,
        side: 0
      }
    );
  }

  assertValidCounts(cards: DeckCompositionCard[]): void {
    const totals = this.calculateTotals(cards);
    const errors: string[] = [];

    if (totals.main < 40 || totals.main > 60) {
      errors.push("Main Deck debe tener entre 40 y 60 cartas.");
    }

    if (totals.extra > 15) {
      errors.push("Extra Deck no puede tener mas de 15 cartas.");
    }

    if (totals.side > 15) {
      errors.push("Side Deck no puede tener mas de 15 cartas.");
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: "La composicion del deck no es valida para confirmar o generar imagen.",
        errors,
        totals
      });
    }
  }

}
