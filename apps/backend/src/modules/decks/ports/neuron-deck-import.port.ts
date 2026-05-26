import { DeckSection } from "@prisma/client";

export const NEURON_DECK_IMPORT_PORT = Symbol("NEURON_DECK_IMPORT_PORT");

export interface ImportedNeuronDeckCard {
  section: DeckSection;
  quantity: number;
  originalName: string;
  displayOrder: number;
}

export interface ImportedNeuronDeck {
  sourceUrl: string;
  cards: ImportedNeuronDeckCard[];
}

export interface NeuronDeckImportPort {
  importDeck(neuronDeckUrl: string): Promise<ImportedNeuronDeck>;
}
