import { DeckSection } from "@prisma/client";

export const DECK_IMAGE_RENDERER_PORT = Symbol("DECK_IMAGE_RENDERER_PORT");

export interface RenderableDeckCard {
  section: DeckSection;
  quantity: number;
  name: string;
  imagePath: string;
  displayOrder: number;
}

export interface RenderableSocialLink {
  platform: string;
  handle: string;
  iconPath?: string;
  displayOrder: number;
}

export interface RenderDeckImageInput {
  playerName: string;
  tournamentDate: Date;
  resultLabel: string;
  deckName: string;
  tournamentName?: string;
  eventTypeName?: string;
  tournamentTypeName?: string;
  sourceCreditText?: string;
  backgroundColor?: string;
  backgroundImagePath?: string;
  primaryLogoPath?: string;
  secondaryLogoPath?: string;
  eventLogoPath?: string;
  socialLinks: RenderableSocialLink[];
  cards: RenderableDeckCard[];
}

export interface RenderDeckImageOutput {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
}

export interface DeckImageRendererPort {
  render(input: RenderDeckImageInput): Promise<RenderDeckImageOutput>;
}
