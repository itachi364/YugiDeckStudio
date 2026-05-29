const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export type UploadDeckInput = {
  storeId: string;
  playerName: string;
  tournamentDate?: string;
  tournamentId: string;
  resultLabel: string;
  deckName: string;
  neuronDeckUrl: string;
  tournamentName?: string;
  eventTypeId?: string;
  tournamentTypeId?: string;
  location?: string;
  deckListImage: File;
};

export type UploadDeckResponse = {
  deckId: string;
  playerId: string;
  tournamentId: string;
  uploadedImageAssetId: string;
  status: string;
  extractionStatus: string;
  reviewStatus: string;
  importedCardCount: number;
  tournamentStatus?: string;
};

export type DeckSummary = {
  deckId: string;
  tournamentId: string;
  tournamentName?: string | null;
  tournamentStatus?: string;
  storeId: string;
  storeName: string;
  playerName: string;
  deckName: string;
  resultLabel: string;
  tournamentDate: string;
  status: string;
  extractionStatus: string;
  reviewStatus: string;
  cardCount: number;
  createdAt: string;
};

export type DeckSection = "MAIN" | "EXTRA" | "SIDE";

export type EditableDeckCard = {
  section: DeckSection;
  quantity: number;
  originalName: string;
  displayOrder: number;
};

export type ExtractDeckResponse = {
  deckId: string;
  status: string;
  extractionStatus: string;
  reviewStatus: string;
  source?: "NEURON";
  cards: EditableDeckCard[];
};

export type ConfirmDeckReviewResponse = {
  deckId: string;
  status: string;
  reviewStatus: string;
  cardCount: number;
};

export type CacheCardImagesResponse = {
  deckId: string;
  cached: Array<{
    cardId: string;
    officialName: string;
    imageAssetId: string;
    storagePath: string;
  }>;
  alreadyCached: Array<{
    cardId: string;
    officialName: string;
    imageAssetId: string;
    storagePath: string;
  }>;
  missing: Array<{
    cardId?: string;
    officialName?: string;
    reason?: string;
  }>;
};

export type GenerateDeckImageResponse = {
  deckId: string;
  generatedImageId: string;
  imageAssetId: string;
  storagePath: string;
  width: number;
  height: number;
  mimeType: string;
  status: string;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { message?: string | string[] };

  if (!response.ok) {
    const message = Array.isArray(payload.message) ? payload.message.join(" ") : payload.message;
    throw new Error(message || "La solicitud no pudo completarse.");
  }

  return payload as T;
}

export const deckApi = {
  async listDecks(accessToken: string) {
    const response = await fetch(`${API_BASE_URL}/decks`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return parseJsonResponse<DeckSummary[]>(response);
  },

  async uploadDeckList(accessToken: string, input: UploadDeckInput) {
    const formData = new FormData();
    formData.append("storeId", input.storeId);
    formData.append("playerName", input.playerName);
    formData.append("tournamentId", input.tournamentId);
    formData.append("resultLabel", input.resultLabel);
    formData.append("deckName", input.deckName);
    formData.append("neuronDeckUrl", input.neuronDeckUrl);
    formData.append("deckListImage", input.deckListImage);

    const optionalFields = {
      tournamentName: input.tournamentName,
      tournamentDate: input.tournamentDate,
      eventTypeId: input.eventTypeId,
      tournamentTypeId: input.tournamentTypeId,
      location: input.location
    };

    Object.entries(optionalFields).forEach(([key, value]) => {
      const trimmedValue = value?.trim();

      if (trimmedValue) {
        formData.append(key, trimmedValue);
      }
    });

    const response = await fetch(`${API_BASE_URL}/decks/uploads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: formData
    });

    return parseJsonResponse<UploadDeckResponse>(response);
  },

  async getDeckCards(accessToken: string, deckId: string) {
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}/cards`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return parseJsonResponse<ExtractDeckResponse>(response);
  },

  async updateDeckCards(accessToken: string, deckId: string, cards: EditableDeckCard[]) {
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}/cards`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ cards })
    });

    return parseJsonResponse<ExtractDeckResponse>(response);
  },

  async confirmDeckReview(accessToken: string, deckId: string) {
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}/review/confirm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return parseJsonResponse<ConfirmDeckReviewResponse>(response);
  },

  async cacheCardImages(accessToken: string, deckId: string) {
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}/cache-card-images`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return parseJsonResponse<CacheCardImagesResponse>(response);
  },

  async generateDeckImage(accessToken: string, deckId: string) {
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}/generate-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return parseJsonResponse<GenerateDeckImageResponse>(response);
  }
};
