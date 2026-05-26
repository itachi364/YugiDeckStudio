import { BadRequestException, Injectable } from "@nestjs/common";
import { DeckSection } from "@prisma/client";
import {
  ImportedNeuronDeck,
  ImportedNeuronDeckCard,
  NeuronDeckImportPort
} from "../ports/neuron-deck-import.port";

interface NeuronDeckTable {
  id: string;
  section: DeckSection;
}

@Injectable()
export class KonamiNeuronDeckImportAdapter implements NeuronDeckImportPort {
  private readonly allowedHosts = new Set(["neuron.konami.net", "www.db.yugioh-card.com"]);
  private readonly deckTables: NeuronDeckTable[] = [
    {
      id: "monster_list",
      section: DeckSection.MAIN
    },
    {
      id: "spell_list",
      section: DeckSection.MAIN
    },
    {
      id: "trap_list",
      section: DeckSection.MAIN
    },
    {
      id: "extra_list",
      section: DeckSection.EXTRA
    },
    {
      id: "side_list",
      section: DeckSection.SIDE
    }
  ];

  async importDeck(neuronDeckUrl: string): Promise<ImportedNeuronDeck> {
    const initialUrl = this.parseAllowedUrl(neuronDeckUrl);
    const response = await this.fetchDeckPage(initialUrl);
    const finalUrl = this.parseAllowedUrl(response.url || initialUrl.toString());
    const html = await response.text();
    const cards = this.parseDeckCards(html);

    if (cards.length === 0) {
      throw new BadRequestException("El link Neuron no contiene una lista de deck parseable.");
    }

    return {
      sourceUrl: finalUrl.toString(),
      cards
    };
  }

  private parseAllowedUrl(value: string): URL {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(value);
    } catch {
      throw new BadRequestException("El link Neuron no tiene un formato valido.");
    }

    if (parsedUrl.protocol !== "https:" || !this.allowedHosts.has(parsedUrl.hostname.toLowerCase())) {
      throw new BadRequestException("El link Neuron debe pertenecer a un dominio Konami permitido.");
    }

    return parsedUrl;
  }

  private async fetchDeckPage(url: URL): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": "YugiDeckStudio/0.1.0"
        },
        redirect: "follow",
        signal: controller.signal
      });

      if (!response.ok) {
        throw new BadRequestException("No fue posible consultar el link Neuron indicado.");
      }

      return response;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException("No fue posible consultar el link Neuron indicado.");
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseDeckCards(html: string): ImportedNeuronDeckCard[] {
    const cards: ImportedNeuronDeckCard[] = [];
    const sectionOrders = new Map<DeckSection, number>([
      [DeckSection.MAIN, 0],
      [DeckSection.EXTRA, 0],
      [DeckSection.SIDE, 0]
    ]);

    for (const table of this.deckTables) {
      const tableHtml = this.extractTableHtml(html, table.id);

      if (!tableHtml) {
        continue;
      }

      for (const row of this.extractRows(tableHtml)) {
        const parsedCard = this.parseCardRow(row);

        if (!parsedCard) {
          continue;
        }

        const displayOrder = (sectionOrders.get(table.section) ?? 0) + 1;
        sectionOrders.set(table.section, displayOrder);
        cards.push({
          section: table.section,
          quantity: parsedCard.quantity,
          originalName: parsedCard.originalName,
          displayOrder
        });
      }
    }

    return cards;
  }

  private extractTableHtml(html: string, tableId: string): string | null {
    const escapedTableId = this.escapeRegex(tableId);
    const match = html.match(new RegExp(`<table[^>]+id=["']${escapedTableId}["'][^>]*>([\\s\\S]*?)</table>`, "i"));

    return match?.[1] ?? null;
  }

  private extractRows(tableHtml: string): string[] {
    return Array.from(tableHtml.matchAll(/<tr\b[^>]*class=["'][^"']*\brow\b[^"']*["'][^>]*>[\s\S]*?<\/tr>/gi)).map(
      (match) => match[0]
    );
  }

  private parseCardRow(rowHtml: string): { quantity: number; originalName: string } | null {
    const nameMatch = rowHtml.match(/<td\b[^>]*class=["']card_name["'][^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);
    const quantityMatch = rowHtml.match(/<td\b[^>]*class=["']num["'][^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);

    if (!nameMatch || !quantityMatch) {
      return null;
    }

    const originalName = this.cleanHtmlText(nameMatch[1]);
    const quantity = Number(this.cleanHtmlText(quantityMatch[1]));

    if (!originalName || !Number.isInteger(quantity) || quantity < 1 || quantity > 3) {
      return null;
    }

    return {
      quantity,
      originalName
    };
  }

  private cleanHtmlText(value: string): string {
    return this.decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))
      .replace(/^【[^】]+】\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private decodeHtmlEntities(value: string): string {
    const namedEntities: Record<string, string> = {
      amp: "&",
      gt: ">",
      lt: "<",
      nbsp: " ",
      quot: "\""
    };

    return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
      const normalizedCode = code.toLowerCase();

      if (normalizedCode.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(normalizedCode.slice(2), 16));
      }

      if (normalizedCode.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(normalizedCode.slice(1), 10));
      }

      return namedEntities[normalizedCode] ?? entity;
    });
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
