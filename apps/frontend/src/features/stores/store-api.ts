const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export type StoreConfiguration = {
  id: string;
  name: string;
  primaryLogoAssetId?: string | null;
  secondaryLogoAssetId?: string | null;
  backgroundImageAssetId?: string | null;
  backgroundColor?: string | null;
  sourceCreditText?: string | null;
  socialLinks?: unknown[];
  eventTypes?: unknown[];
  tournamentTypes?: unknown[];
};

export type UpdateStoreConfigurationInput = {
  name?: string;
  primaryLogoAssetId?: string | null;
  secondaryLogoAssetId?: string | null;
  backgroundImageAssetId?: string | null;
  backgroundColor?: string | null;
  sourceCreditText?: string | null;
};

export type CreateStoreInput = {
  name: string;
  backgroundColor?: string | null;
  sourceCreditText?: string | null;
};

export type StoreAssetCategory = "STORE_LOGO" | "EVENT_LOGO" | "SOCIAL_LOGO" | "BACKGROUND_IMAGE";

export type StoreSummary = {
  id: string;
  name: string;
};

export type StoreAssetOption = {
  id: string;
  category: StoreAssetCategory;
  originalFilename?: string | null;
  storagePath: string;
};

export type UploadStoreAssetResponse = {
  imageAssetId: string;
  category: StoreAssetCategory;
  storagePath: string;
  retentionPolicy: string;
};

export type StoreEventType = {
  id: string;
  storeId?: string;
  store?: {
    id: string;
    name: string;
  } | null;
  name: string;
  description?: string | null;
  logoAssetId?: string | null;
  isActive: boolean;
};

export type StoreTournamentType = StoreEventType;

export type ConfigureStoreCatalogInput = {
  name: string;
  description?: string | null;
  logoAssetId?: string | null;
  isActive?: boolean;
};

export type StoreSocialLink = {
  id?: string;
  platform: string;
  handle: string;
  url?: string | null;
  iconAssetId?: string | null;
  displayOrder?: number;
  isActive?: boolean;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { message?: string | string[] };

  if (!response.ok) {
    const message = Array.isArray(payload.message) ? payload.message.join(" ") : payload.message;
    throw new Error(message || "La solicitud no pudo completarse.");
  }

  return payload as T;
}

export const storeApi = {
  async listStores(accessToken: string) {
    const response = await fetch(`${API_BASE_URL}/stores`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return parseJsonResponse<StoreSummary[]>(response);
  },

  async getStoreConfiguration(accessToken: string, storeId: string) {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return parseJsonResponse<StoreConfiguration>(response);
  },

  async createStore(accessToken: string, input: CreateStoreInput) {
    const response = await fetch(`${API_BASE_URL}/stores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(input)
    });

    return parseJsonResponse<StoreConfiguration>(response);
  },

  async updateStoreConfiguration(
    accessToken: string,
    storeId: string,
    input: UpdateStoreConfigurationInput
  ) {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(input)
    });

    return parseJsonResponse<StoreConfiguration>(response);
  },

  async uploadStoreAsset(
    accessToken: string,
    storeId: string,
    category: StoreAssetCategory,
    image: File
  ) {
    const formData = new FormData();
    formData.append("category", category);
    formData.append("image", image);

    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/assets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: formData
    });

    return parseJsonResponse<UploadStoreAssetResponse>(response);
  },

  async listStoreAssets(accessToken: string, storeId: string, category?: StoreAssetCategory) {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/assets${query}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return parseJsonResponse<StoreAssetOption[]>(response);
  },

  async listEventTypes(accessToken: string, storeId: string) {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/event-types`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return parseJsonResponse<StoreEventType[]>(response);
  },

  async listVisibleEventTypes(accessToken: string) {
    const response = await fetch(`${API_BASE_URL}/stores/event-types`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return parseJsonResponse<StoreEventType[]>(response);
  },

  async createEventType(accessToken: string, storeId: string, input: ConfigureStoreCatalogInput) {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/event-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(input)
    });

    return parseJsonResponse<StoreEventType>(response);
  },

  async updateEventType(accessToken: string, storeId: string, eventTypeId: string, input: ConfigureStoreCatalogInput) {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/event-types/${eventTypeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(input)
    });

    return parseJsonResponse<StoreEventType>(response);
  },

  async deleteEventType(accessToken: string, storeId: string, eventTypeId: string) {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/event-types/${eventTypeId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return parseJsonResponse<StoreEventType>(response);
  },

  async listTournamentTypes(accessToken: string, storeId: string) {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/tournament-types`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return parseJsonResponse<StoreTournamentType[]>(response);
  },

  async createTournamentType(accessToken: string, storeId: string, input: ConfigureStoreCatalogInput) {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/tournament-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(input)
    });

    return parseJsonResponse<StoreTournamentType>(response);
  },

  async updateTournamentType(accessToken: string, storeId: string, tournamentTypeId: string, input: ConfigureStoreCatalogInput) {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/tournament-types/${tournamentTypeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(input)
    });

    return parseJsonResponse<StoreTournamentType>(response);
  },

  async listSocialLinks(accessToken: string, storeId: string) {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/social-links`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return parseJsonResponse<StoreSocialLink[]>(response);
  },

  async replaceSocialLinks(accessToken: string, storeId: string, links: StoreSocialLink[]) {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/social-links`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ links })
    });

    return parseJsonResponse<StoreSocialLink[]>(response);
  }
};
