import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const fetchMock = vi.fn();
const encryptedPayloadShape = expect.objectContaining({
  encryptedPayload: expect.objectContaining({
    keyId: "test-key",
    encryptedKey: expect.any(String),
    iv: expect.any(String),
    ciphertext: expect.any(String)
  })
});

function renderApp() {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

function mockJsonResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body)
  } as Response);
}

function buildMainDeckCards(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    section: "MAIN",
    quantity: 1,
    originalName: `Card ${index + 1}`,
    displayOrder: index + 1
  }));
}

async function queueSecurityLists() {
  fetchMock
    .mockResolvedValueOnce(
      await mockJsonResponse([
        {
          id: "root-id",
          username: "root",
          displayName: "Root",
          storeId: null,
          isRoot: true,
          mustChangePassword: false,
          isActive: true,
          store: null,
          userRoles: [
            {
              role: {
                id: "role-root",
                name: "root",
                isSystemRole: true
              }
            }
          ]
        }
      ])
    )
    .mockResolvedValueOnce(
      await mockJsonResponse([
        {
          id: "role-root",
          name: "root",
          description: "Root",
          isSystemRole: true,
          rolePermissions: []
        }
      ])
    )
    .mockResolvedValueOnce(
      await mockJsonResponse([
        {
          id: "permission-security",
          code: "security.manage",
          description: "Administrar seguridad"
        }
      ])
    )
    .mockResolvedValueOnce(await mockJsonResponse([{ id: "store-id", name: "Ready For Duel" }]));
}

function openTournamentSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: "tournament-id",
    storeId: "store-id",
    store: {
      id: "store-id",
      name: "Ready For Duel"
    },
    eventTypeId: "event-type-id",
    eventType: {
      id: "event-type-id",
      name: "Evento Mensual YugiOh"
    },
    name: "Torneo Mes de Abril",
    description: "Top local",
    logoAssetId: null,
    eventDate: "2026-05-21T00:00:00.000Z",
    location: "Bogota",
    status: "OPEN",
    decks: [],
    _count: {
      decks: 0
    },
    ...overrides
  };
}

async function queueVisibleTournaments(tournaments: unknown[] = []) {
  fetchMock.mockResolvedValueOnce(await mockJsonResponse(tournaments));
}

async function queueTournamentList(tournaments: unknown[] = [openTournamentSummary()]) {
  fetchMock.mockResolvedValueOnce(await mockJsonResponse(tournaments));
}

async function queueStoreList(stores: unknown[] = [{ id: "store-id", name: "Ready For Duel" }]) {
  fetchMock.mockResolvedValueOnce(await mockJsonResponse(stores));
}

async function queueStoreAssets(assets: unknown[] = []) {
  fetchMock.mockResolvedValueOnce(await mockJsonResponse(assets));
}

function setupAuthEncryptionMock() {
  const encryptedBytes = new TextEncoder().encode("encrypted-payload");
  const rawAesKey = new Uint8Array(32).fill(9);
  const subtle = {
    importKey: vi.fn().mockResolvedValue({}),
    generateKey: vi.fn().mockResolvedValue({}),
    exportKey: vi.fn().mockResolvedValue(rawAesKey.buffer),
    encrypt: vi.fn().mockResolvedValue(encryptedBytes.buffer)
  };
  const cryptoMock = {
    subtle,
    getRandomValues: (array: Uint8Array) => {
      array.fill(7);
      return array;
    }
  } as unknown as Crypto;

  vi.stubGlobal("crypto", cryptoMock);
  window.__YUGIDECKSTUDIO_AUTH_ENCRYPTION_KEY__ = {
    keyId: "test-key",
    algorithm: "RSA-OAEP-256+A256GCM",
    publicKeyJwk: {
      kty: "RSA",
      n: "test",
      e: "AQAB",
      alg: "RSA-OAEP-256",
      ext: true
    }
  };
}

function expectEncryptedPost(path: string, disallowedValues: string[]) {
  const call = fetchMock.mock.calls.find(([url, options]) => url === path && options?.method === "POST");
  const body = String(call?.[1]?.body ?? "");

  expect(call).toBeDefined();
  disallowedValues.forEach((value) => expect(body).not.toContain(value));
  expect(JSON.parse(body)).toEqual(encryptedPayloadShape);
}

async function loginAndOpenDecks(
  user: ReturnType<typeof userEvent.setup>,
  decks: unknown[] = [
    {
      deckId: "deck-id",
      storeId: "store-id",
      storeName: "Ready For Duel",
      playerName: "Operator",
      deckName: "White Forest",
      tournamentId: "tournament-id",
      tournamentName: "Torneo Mes de Abril",
      tournamentStatus: "OPEN",
      resultLabel: "Top 8",
      tournamentDate: "2026-05-21T00:00:00.000Z",
      status: "EXTRACTED",
      extractionStatus: "EXTRACTED",
      reviewStatus: "PENDING",
      cardCount: 40,
      createdAt: "2026-05-26T00:00:00.000Z"
    }
  ]
) {
  fetchMock.mockResolvedValueOnce(
    await mockJsonResponse({
      accessToken: "operator-token",
      expiresIn: "1d",
      user: {
        id: "operator-id",
        username: "operator",
        displayName: "Operator",
        storeId: "store-id",
        isRoot: false,
        mustChangePassword: false,
        roles: ["operator"]
      }
    })
  );
  await queueVisibleTournaments();
  await queueStoreList();
  fetchMock.mockResolvedValueOnce(await mockJsonResponse(decks));
  await queueTournamentList();

  renderApp();

  await user.type(screen.getByLabelText(/usuario/i), "operator");
  await user.type(screen.getByLabelText(/contrasena/i), "Operator123!");
  await user.click(screen.getByRole("button", { name: /entrar/i }));
  await user.click(await screen.findByRole("button", { name: /decks/i }));

  expect(await screen.findByRole("heading", { name: /carga de deck/i })).toBeInTheDocument();
}

async function loginAndOpenStoreConfiguration(user: ReturnType<typeof userEvent.setup>) {
  fetchMock.mockResolvedValueOnce(
    await mockJsonResponse({
      accessToken: "admin-token",
      expiresIn: "1d",
      user: {
        id: "admin-id",
        username: "admin",
        displayName: "Store Admin",
        storeId: "store-id",
        isRoot: false,
        mustChangePassword: false,
        roles: ["store_admin"]
      }
    })
  );
  await queueVisibleTournaments();
  await queueStoreList();

  renderApp();

  await user.type(screen.getByLabelText(/usuario/i), "admin");
  await user.type(screen.getByLabelText(/contrasena/i), "Admin123!");
  await user.click(screen.getByRole("button", { name: /entrar/i }));
  await user.click(await screen.findByRole("button", { name: /tienda/i }));

  expect(await screen.findByRole("form", { name: /configuracion base de tienda/i })).toBeInTheDocument();
}

async function loginAndOpenCatalogs(user: ReturnType<typeof userEvent.setup>) {
  fetchMock.mockResolvedValueOnce(
    await mockJsonResponse({
      accessToken: "admin-token",
      expiresIn: "1d",
      user: {
        id: "admin-id",
        username: "admin",
        displayName: "Store Admin",
        storeId: "store-id",
        isRoot: false,
        mustChangePassword: false,
        roles: ["store_admin"]
      }
    })
  );
  await queueVisibleTournaments();
  await queueStoreList();

  renderApp();

  await user.type(screen.getByLabelText(/usuario/i), "admin");
  await user.type(screen.getByLabelText(/contrasena/i), "Admin123!");
  await user.click(screen.getByRole("button", { name: /entrar/i }));
  await user.click(await screen.findByRole("button", { name: /catalogos/i }));

  expect(await screen.findByRole("heading", { level: 2, name: /eventos y torneos/i })).toBeInTheDocument();
}

function setDesktopViewport() {
  setViewportMatches(false);
}

function setMobileViewport() {
  setViewportMatches(true);
}

function setViewportMatches(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

describe("App", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    setupAuthEncryptionMock();
    localStorage.clear();
    setDesktopViewport();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete window.__YUGIDECKSTUDIO_AUTH_ENCRYPTION_KEY__;
    localStorage.clear();
  });

  it("renders the local login form", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: /login local/i })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: /login local/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /contrasena/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /seguridad/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /decks/i })).not.toBeInTheDocument();
  });

  it("allows root to open registration after login and register an operator", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "jwt-token",
        expiresIn: "1d",
        user: {
          id: "root-id",
          username: "root",
          displayName: "Root",
          storeId: null,
          isRoot: true,
          mustChangePassword: false,
          roles: ["root"]
        }
      })
    );
    await queueVisibleTournaments();
    await queueStoreList();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        userId: "user-id",
        username: "operator1",
        storeId: "store-id",
        roles: ["operator"]
      })
    );

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "root");
    await user.type(screen.getByLabelText(/contrasena/i), "ChangedPassword123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    await user.click(await screen.findByRole("button", { name: /registro/i }));

    await user.selectOptions(await screen.findByLabelText(/tienda/i), "store-id");
    await user.type(screen.getByLabelText(/^usuario$/i), "operator1");
    await user.type(screen.getByLabelText(/nombre visible/i), "Operator One");
    await user.type(screen.getByLabelText(/email/i), "operator@example.com");
    await user.type(screen.getByLabelText(/^contrasena$/i), "Operator123!");
    await user.click(screen.getByRole("button", { name: /registrar/i }));

    expectEncryptedPost("/api/auth/login", ["ChangedPassword123!"]);
    expectEncryptedPost("/api/auth/register", ["Operator123!"]);
    expect(await screen.findByText(/usuario operator1 registrado como operator/i)).toBeInTheDocument();
  });

  it("forces password change when login returns mustChangePassword", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "jwt-token",
        expiresIn: "1d",
        user: {
          id: "root-id",
          username: "root",
          displayName: "Root",
          storeId: null,
          isRoot: true,
          mustChangePassword: true,
          roles: ["root"]
        }
      })
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        userId: "root-id",
        mustChangePassword: false
      })
    );
    await queueVisibleTournaments();

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "root");
    await user.type(screen.getByLabelText(/contrasena/i), "ChangeMe123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("heading", { name: /cambiar contrasena/i })).toBeInTheDocument();
    expect(screen.getByText(/debes cambiar la contrasena antes de continuar/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /contrasena/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /seguridad/i })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/contrasena actual/i), "ChangeMe123!");
    await user.type(screen.getByLabelText(/nueva contrasena/i), "NewPassword123!");
    await user.click(screen.getByRole("button", { name: /actualizar/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/change-password",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-token"
        })
      })
    );
    expectEncryptedPost("/api/auth/change-password", ["ChangeMe123!", "NewPassword123!"]);
    expect(await screen.findByText(/contrasena actualizada/i)).toBeInTheDocument();
  });

  it("loads the security workspace after login", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "jwt-token",
        expiresIn: "1d",
        user: {
          id: "root-id",
          username: "root",
          displayName: "Root",
          storeId: null,
          isRoot: true,
          mustChangePassword: false,
          roles: ["root"]
        }
      })
    );
    await queueVisibleTournaments();
    await queueSecurityLists();

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "root");
    await user.type(screen.getByLabelText(/contrasena/i), "ChangedPassword123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    await user.click(await screen.findByRole("button", { name: /seguridad/i }));

    expect(await screen.findByRole("heading", { name: /seguridad local/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /usuarios, roles y permisos/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/users",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-token"
        })
      })
    );
  });

  it("returns to anonymous navigation after logout", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "jwt-token",
        expiresIn: "1d",
        user: {
          id: "root-id",
          username: "root",
          displayName: "Root",
          storeId: null,
          isRoot: true,
          mustChangePassword: false,
          roles: ["root"]
        }
      })
    );
    await queueVisibleTournaments();

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "root");
    await user.type(screen.getByLabelText(/contrasena/i), "ChangedPassword123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    await screen.findByRole("button", { name: /registro/i });
    await user.click(screen.getByRole("button", { name: /cerrar sesion/i }));

    expect(screen.getByRole("heading", { name: /login local/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /decks/i })).not.toBeInTheDocument();
  });

  it("keeps the local session after the app reloads", async () => {
    const user = userEvent.setup();
    const firstRender = renderApp();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "jwt-token",
        expiresIn: "1d",
        user: {
          id: "root-id",
          username: "root",
          displayName: "Root",
          storeId: null,
          isRoot: true,
          mustChangePassword: false,
          roles: ["root"]
        }
      })
    );
    await queueVisibleTournaments();

    await user.type(screen.getByLabelText(/usuario/i), "root");
    await user.type(screen.getByLabelText(/contrasena/i), "ChangedPassword123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("heading", { name: /torneos configurados/i })).toBeInTheDocument();
    expect(localStorage.getItem("yugideckstudio.session")).toContain("jwt-token");

    firstRender.unmount();
    await queueVisibleTournaments();
    renderApp();

    expect(await screen.findByRole("heading", { name: /torneos configurados/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decks/i })).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: /login local/i })).not.toBeInTheDocument();
  });

  it("drops a stored session after twenty minutes without activity", async () => {
    localStorage.setItem(
      "yugideckstudio.session",
      JSON.stringify({
        accessToken: "operator-token",
        user: {
          id: "operator-id",
          username: "operator",
          displayName: "Operator",
          storeId: "store-id",
          isRoot: false,
          mustChangePassword: false,
          roles: ["operator"]
        },
        lastActivityAt: Date.now() - 20 * 60 * 1000
      })
    );

    renderApp();

    expect(screen.getByRole("heading", { name: /login local/i })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: /login local/i })).toBeInTheDocument();
    expect(localStorage.getItem("yugideckstudio.session")).toBeNull();
  });

  it("creates roles and permissions from the security workspace", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "jwt-token",
        expiresIn: "1d",
        user: {
          id: "root-id",
          username: "root",
          displayName: "Root",
          storeId: null,
          isRoot: true,
          mustChangePassword: false,
          roles: ["root"]
        }
      })
    );
    await queueVisibleTournaments();
    await queueSecurityLists();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        id: "role-judge",
        name: "judge",
        isSystemRole: false
      })
    );
    await queueSecurityLists();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        id: "permission-judge",
        code: "judge.manage"
      })
    );
    await queueSecurityLists();

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "root");
    await user.type(screen.getByLabelText(/contrasena/i), "ChangedPassword123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    await user.click(await screen.findByRole("button", { name: /seguridad/i }));

    await user.type(await screen.findByLabelText(/^nombre$/i), "judge");
    await user.type(screen.getAllByLabelText(/^descripcion$/i)[0], "Gestionar jueces");
    await user.click(screen.getByRole("button", { name: /crear rol/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/roles",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "judge",
          description: "Gestionar jueces",
          isSystemRole: false
        })
      })
    );

    await user.type(screen.getByLabelText(/^codigo$/i), "judge.manage");
    await user.type(screen.getAllByLabelText(/^descripcion$/i)[1], "Gestionar jueces");
    await user.click(screen.getByRole("button", { name: /crear permiso/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/permissions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          code: "judge.manage",
          description: "Gestionar jueces"
        })
      })
    );
  });

  it("hides root-only navigation for operators", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "operator-token",
        expiresIn: "1d",
        user: {
          id: "operator-id",
          username: "operator",
          displayName: "Operator",
          storeId: "store-id",
          isRoot: false,
          mustChangePassword: false,
          roles: ["operator"]
        }
      })
    );
    await queueVisibleTournaments([openTournamentSummary({ name: "Torneo Regional", eventType: { id: "event-type-id", name: "Regional" } })]);

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "operator");
    await user.type(screen.getByLabelText(/contrasena/i), "Operator123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("heading", { name: /torneos configurados/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /seguridad/i })).not.toBeInTheDocument();
    expect(screen.getByText(/^torneo regional$/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /eliminar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /torneos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decks/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /revision/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^imagen$/i })).not.toBeInTheDocument();
  });

  it("loads the configured tournaments index after login", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "operator-token",
        expiresIn: "1d",
        user: {
          id: "operator-id",
          username: "operator",
          displayName: "Operator",
          storeId: "store-id",
          isRoot: false,
          mustChangePassword: false,
          roles: ["operator"]
        }
      })
    );
    await queueVisibleTournaments([openTournamentSummary()]);

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "operator");
    await user.type(screen.getByLabelText(/contrasena/i), "Operator123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("heading", { name: /torneos configurados/i })).toBeInTheDocument();
    expect(screen.getByText(/torneos visibles/i)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/torneo mes de abril/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores/tournaments",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer operator-token"
        })
      })
    );
  });

  it("lets operators close tournaments when a winner deck exists", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "operator-token",
        expiresIn: "1d",
        user: {
          id: "operator-id",
          username: "operator",
          displayName: "Operator",
          storeId: "store-id",
          isRoot: false,
          mustChangePassword: false,
          roles: ["operator"]
        }
      })
    );
    await queueVisibleTournaments([
      openTournamentSummary({
        decks: [{ resultLabel: "Ganador" }],
        _count: { decks: 1 }
      })
    ]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse(
        openTournamentSummary({
          status: "CLOSED",
          decks: [{ resultLabel: "Ganador" }],
          _count: { decks: 1 }
        })
      )
    );

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "operator");
    await user.type(screen.getByLabelText(/contrasena/i), "Operator123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    await screen.findByRole("heading", { name: /torneos configurados/i });

    expect(screen.queryByRole("button", { name: /eliminar/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cerrar torneo/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores/store-id/tournaments/tournament-id/close",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer operator-token"
        })
      })
    );
    expect(await screen.findByText(/torneo torneo mes de abril cerrado/i)).toBeInTheDocument();
  });

  it("lets root see tournaments from all stores", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "jwt-token",
        expiresIn: "1d",
        user: {
          id: "root-id",
          username: "root",
          displayName: "Root",
          storeId: null,
          isRoot: true,
          mustChangePassword: false,
          roles: ["root"]
        }
      })
    );
    await queueVisibleTournaments([
      openTournamentSummary({
        id: "tournament-a",
        storeId: "store-a",
        store: { id: "store-a", name: "Ready For Duel" },
        name: "Torneo Regional"
      }),
      openTournamentSummary({
        id: "tournament-b",
        storeId: "store-b",
        store: { id: "store-b", name: "Yugi Local" },
        name: "Torneo Premiere"
      })
    ]);

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "root");
    await user.type(screen.getByLabelText(/contrasena/i), "ChangedPassword123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText(/ready for duel/i)).toBeInTheDocument();
    expect(screen.getByText(/yugi local/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/torneo regional/i)).toBeInTheDocument();
    expect(screen.getByText(/torneo premiere/i)).toBeInTheDocument();
  });

  it("uploads a deck list image with required metadata", async () => {
    const user = userEvent.setup();
    const deckImage = new File(["deck"], "deck.png", { type: "image/png" });
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "operator-token",
        expiresIn: "1d",
        user: {
          id: "operator-id",
          username: "operator",
          displayName: "Operator",
          storeId: "store-id",
          isRoot: false,
          mustChangePassword: false,
          roles: ["operator"]
        }
      })
    );
    await queueVisibleTournaments();
    await queueStoreList();
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    await queueTournamentList();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        playerId: "player-id",
        tournamentId: "tournament-id",
        uploadedImageAssetId: "asset-id",
        status: "EXTRACTED",
        extractionStatus: "EXTRACTED",
        reviewStatus: "PENDING",
        importedCardCount: 42
      })
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse([
        {
          deckId: "deck-id",
          storeId: "store-id",
          storeName: "Ready For Duel",
          playerName: "Kaihuang Zhang",
          deckName: "White Forest",
          tournamentId: "tournament-id",
          tournamentName: "Torneo Mes de Abril",
          tournamentStatus: "OPEN",
          resultLabel: "Top 8",
          tournamentDate: "2026-05-21T00:00:00.000Z",
          status: "EXTRACTED",
          extractionStatus: "EXTRACTED",
          reviewStatus: "PENDING",
          cardCount: 42,
          createdAt: "2026-05-26T00:00:00.000Z"
        }
      ])
    );

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "operator");
    await user.type(screen.getByLabelText(/contrasena/i), "Operator123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    await user.click(await screen.findByRole("button", { name: /decks/i }));

    expect(await screen.findByRole("heading", { name: /carga de deck/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/jugador/i), "Kaihuang Zhang");
    await user.selectOptions(screen.getByLabelText(/resultado/i), "Top 8");
    await user.selectOptions(screen.getByLabelText(/^torneo$/i), "tournament-id");
    await user.type(screen.getByLabelText(/deck usado/i), "White Forest");
    await user.type(screen.getByLabelText(/link neuron/i), "https://neuron.konami.net/link/6omm271xgfka1d95");
    await user.upload(screen.getByLabelText(/imagen deck list/i), deckImage);
    await user.click(screen.getByRole("button", { name: /cargar deck/i }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => url === "/api/decks/uploads")).toBe(true);
    });

    const uploadCall = fetchMock.mock.calls.find(([url]) => url === "/api/decks/uploads");
    expect(uploadCall).toBeDefined();
    expect(uploadCall?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer operator-token"
        })
      })
    );

    const body = uploadCall?.[1]?.body as FormData;
    expect(body.get("storeId")).toBe("store-id");
    expect(body.get("playerName")).toBe("Kaihuang Zhang");
    expect(body.get("tournamentId")).toBe("tournament-id");
    expect(body.get("resultLabel")).toBe("Top 8");
    expect(body.get("deckName")).toBe("White Forest");
    expect(body.get("neuronDeckUrl")).toBe("https://neuron.konami.net/link/6omm271xgfka1d95");
    expect(body.get("deckListImage")).toBe(deckImage);
    expect(await screen.findByText(/deck cargado con 42 cartas importadas desde neuron/i)).toBeInTheDocument();
  });

  it("rejects deck upload without an image before calling the api", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "operator-token",
        expiresIn: "1d",
        user: {
          id: "operator-id",
          username: "operator",
          displayName: "Operator",
          storeId: "store-id",
          isRoot: false,
          mustChangePassword: false,
          roles: ["operator"]
        }
      })
    );
    await queueVisibleTournaments();
    await queueStoreList();
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    await queueTournamentList();

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "operator");
    await user.type(screen.getByLabelText(/contrasena/i), "Operator123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    await user.click(await screen.findByRole("button", { name: /decks/i }));

    await user.type(screen.getByLabelText(/jugador/i), "Kaihuang Zhang");
    await user.selectOptions(screen.getByLabelText(/resultado/i), "Top 8");
    await user.selectOptions(screen.getByLabelText(/^torneo$/i), "tournament-id");
    await user.type(screen.getByLabelText(/deck usado/i), "White Forest");
    await user.type(screen.getByLabelText(/link neuron/i), "https://neuron.konami.net/link/6omm271xgfka1d95");
    await user.click(screen.getByRole("button", { name: /cargar deck/i }));

    expect(await screen.findByText(/la imagen del deck list es obligatoria/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/decks/uploads")).toBe(false);
  });

  it("opens a loaded deck from the decks list and saves manual review changes", async () => {
    const user = userEvent.setup();
    await loginAndOpenDecks(user);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        status: "EXTRACTED",
        extractionStatus: "EXTRACTED",
        reviewStatus: "PENDING",
        cards: [
          {
            section: "MAIN",
            quantity: 3,
            originalName: "Silvy del Bosque Blanco",
            displayOrder: 1
          },
          {
            section: "MAIN",
            quantity: 1,
            originalName: "| <<< Tol Carias de Trampa",
            displayOrder: 2
          }
        ]
      })
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        status: "EXTRACTED",
        extractionStatus: "EXTRACTED",
        reviewStatus: "PENDING",
        cards: [
          {
            section: "MAIN",
            quantity: 3,
            originalName: "Silvy, Sage of the White Forest",
            displayOrder: 1
          }
        ]
      })
    );

    await user.click(screen.getAllByRole("button", { name: /revisar/i })[0]);

    expect(await screen.findByRole("dialog", { name: /revisar deck/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /revisar composicion/i })).toBeInTheDocument();
    expect((await screen.findAllByText(/main deck/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/main deck debe tener entre 40 y 60 cartas/i)).toBeInTheDocument();
    expect(await screen.findByDisplayValue(/silvy del bosque blanco/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resolver nombres/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar deck/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /agregar carta/i }));
    expect(screen.getByLabelText(/eliminar carta sin nombre/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/eliminar carta sin nombre/i));
    await user.click(screen.getByRole("button", { name: /eliminar.*tol carias de trampa/i }));
    await user.clear(screen.getByLabelText(/^nombre$/i));
    await user.type(screen.getByLabelText(/^nombre$/i), "Silvy, Sage of the White Forest");
    await user.click(screen.getByRole("button", { name: /guardar revision/i }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => url === "/api/decks/deck-id/cards")).toBe(true);
    });

    const correctionCall = fetchMock.mock.calls.find(
      ([url, options]) => url === "/api/decks/deck-id/cards" && options?.method === "PUT"
    );
    expect(correctionCall?.[1]).toEqual(
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer operator-token"
        }),
        body: JSON.stringify({
          cards: [
            {
              section: "MAIN",
              quantity: 3,
              originalName: "Silvy, Sage of the White Forest",
              displayOrder: 1
            }
          ]
        })
      })
    );
    expect(await screen.findByText(/revision del deck guardada/i)).toBeInTheDocument();
  });

  it("keeps deck confirmation disabled when reviewed deck is incomplete", async () => {
    const user = userEvent.setup();
    await loginAndOpenDecks(user);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        status: "EXTRACTED",
        extractionStatus: "EXTRACTED",
        reviewStatus: "PENDING",
        cards: [
          {
            section: "MAIN",
            quantity: 1,
            originalName: "Called by the Grave",
            displayOrder: 1
          }
        ]
      })
    );

    await user.click(screen.getAllByRole("button", { name: /revisar/i })[0]);
    await screen.findByDisplayValue(/called by the grave/i);

    expect(screen.getByText(/main deck debe tener entre 40 y 60 cartas/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar deck/i })).toBeDisabled();
  });

  it("opens deck review as a full mobile view instead of a desktop modal", async () => {
    setMobileViewport();
    const user = userEvent.setup();
    await loginAndOpenDecks(user);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        status: "EXTRACTED",
        extractionStatus: "EXTRACTED",
        reviewStatus: "PENDING",
        cards: buildMainDeckCards(40)
      })
    );

    await user.click(screen.getAllByRole("button", { name: /revisar/i })[0]);

    expect(await screen.findByRole("heading", { name: /revisar composicion/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /revisar deck/i })).not.toBeInTheDocument();
  });

  it("shows confirmed review status and disables review for already reviewed decks", async () => {
    const user = userEvent.setup();
    await loginAndOpenDecks(user, [confirmedDeckSummary()]);

    expect(screen.getAllByText(/confirmed/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /revisar/i })).toBeDisabled();
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/decks/deck-id")).toBe(false);
  });

  it("confirms the reviewed deck after opening it from the upload result", async () => {
    const user = userEvent.setup();
    const mainDeckCards = buildMainDeckCards(40);
    const deckImage = new File(["deck"], "deck.png", { type: "image/png" });
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "operator-token",
        expiresIn: "1d",
        user: {
          id: "operator-id",
          username: "operator",
          displayName: "Operator",
          storeId: "store-id",
          isRoot: false,
          mustChangePassword: false,
          roles: ["operator"]
        }
      })
    );
    await queueVisibleTournaments();
    await queueStoreList();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse([])
    );
    await queueTournamentList();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        playerId: "player-id",
        tournamentId: "tournament-id",
        uploadedImageAssetId: "asset-id",
        status: "EXTRACTED",
        extractionStatus: "EXTRACTED",
        reviewStatus: "PENDING",
        importedCardCount: 40
      })
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse([
        {
          deckId: "deck-id",
          storeId: "store-id",
          storeName: "Ready For Duel",
          playerName: "Operator",
          deckName: "White Forest",
          tournamentId: "tournament-id",
          tournamentName: "Torneo Mes de Abril",
          tournamentStatus: "OPEN",
          resultLabel: "Top 8",
          tournamentDate: "2026-05-21T00:00:00.000Z",
          status: "EXTRACTED",
          extractionStatus: "EXTRACTED",
          reviewStatus: "PENDING",
          cardCount: 40,
          createdAt: "2026-05-26T00:00:00.000Z"
        }
      ])
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        status: "EXTRACTED",
        extractionStatus: "EXTRACTED",
        reviewStatus: "PENDING",
        cards: mainDeckCards
      })
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        status: "REVIEWED",
        reviewStatus: "CONFIRMED",
        cardCount: 40
      })
    );

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "operator");
    await user.type(screen.getByLabelText(/contrasena/i), "Operator123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    await user.click(await screen.findByRole("button", { name: /decks/i }));
    await user.type(screen.getByLabelText(/jugador/i), "Operator");
    await user.selectOptions(screen.getByLabelText(/resultado/i), "Top 8");
    await user.selectOptions(screen.getByLabelText(/^torneo$/i), "tournament-id");
    await user.type(screen.getByLabelText(/deck usado/i), "White Forest");
    await user.type(screen.getByLabelText(/link neuron/i), "https://neuron.konami.net/link/6omm271xgfka1d95");
    await user.upload(screen.getByLabelText(/imagen deck list/i), deckImage);
    await user.click(screen.getByRole("button", { name: /cargar deck/i }));
    await screen.findByText(/deck cargado con 40 cartas/i);
    await user.click(screen.getByRole("button", { name: /revisar deck/i }));
    await screen.findByDisplayValue("Card 1");
    await user.click(screen.getByRole("button", { name: /confirmar deck/i }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => url === "/api/decks/deck-id/review/confirm")).toBe(true);
    });
    expect(await screen.findByText(/deck confirmado con 40 cartas/i)).toBeInTheDocument();
    expect(screen.getAllByText(/confirmed/i).length).toBeGreaterThan(0);
  });

  it("loads store configuration with branding data", async () => {
    const user = userEvent.setup();
    await loginAndOpenStoreConfiguration(user);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        id: "store-id",
        name: "Ready For Duel",
        primaryLogoAssetId: "primary-logo-id",
        secondaryLogoAssetId: "secondary-logo-id",
        backgroundImageAssetId: "background-id",
        backgroundColor: "#10131a",
        sourceCreditText: "ReadyForDuel",
        socialLinks: [],
        eventTypes: [],
        tournamentTypes: []
      })
    );
    await queueStoreAssets([
      { id: "primary-logo-id", category: "STORE_LOGO", originalFilename: "primary.png", storagePath: "store-logos/primary.png" },
      { id: "secondary-logo-id", category: "STORE_LOGO", originalFilename: "secondary.png", storagePath: "store-logos/secondary.png" }
    ]);
    await queueStoreAssets([
      { id: "background-id", category: "BACKGROUND_IMAGE", originalFilename: "background.png", storagePath: "backgrounds/background.png" }
    ]);

    await user.click(screen.getByRole("button", { name: /consultar/i }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => url === "/api/stores/store-id")).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores/store-id",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token"
        })
      })
    );
    expect(await screen.findByLabelText(/nombre de tienda/i)).toHaveValue("Ready For Duel");
    expect(screen.getByDisplayValue("#10131a")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ReadyForDuel")).toBeInTheDocument();
  });

  it("updates store name, credit text and background color", async () => {
    const user = userEvent.setup();
    await loginAndOpenStoreConfiguration(user);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        id: "store-id",
        name: "Ready For Duel",
        primaryLogoAssetId: "primary-logo-id",
        secondaryLogoAssetId: null,
        backgroundImageAssetId: null,
        backgroundColor: "#10131a",
        sourceCreditText: "ReadyForDuel",
        socialLinks: [],
        eventTypes: [],
        tournamentTypes: []
      })
    );
    await queueStoreAssets([{ id: "primary-logo-id", category: "STORE_LOGO", originalFilename: "primary.png", storagePath: "store-logos/primary.png" }]);
    await queueStoreAssets([]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        id: "store-id",
        name: "Yugi Local Store",
        primaryLogoAssetId: "primary-logo-id",
        secondaryLogoAssetId: null,
        backgroundImageAssetId: null,
        backgroundColor: "#223344",
        sourceCreditText: "YugiLocal",
        socialLinks: [],
        eventTypes: [],
        tournamentTypes: []
      })
    );

    await user.click(screen.getByRole("button", { name: /consultar/i }));
    await screen.findByLabelText(/nombre de tienda/i);

    await user.clear(screen.getByLabelText(/nombre de tienda/i));
    await user.type(screen.getByLabelText(/nombre de tienda/i), "Yugi Local Store");
    await user.clear(screen.getByLabelText(/color de fondo/i));
    await user.type(screen.getByLabelText(/color de fondo/i), "#223344");
    await user.clear(screen.getByLabelText(/credito inferior/i));
    await user.type(screen.getByLabelText(/credito inferior/i), "YugiLocal");
    await user.click(screen.getByRole("button", { name: /guardar configuracion/i }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url, options]) => url === "/api/stores/store-id" && options?.method === "PUT")).toBe(true);
    });

    const updateCall = fetchMock.mock.calls.find(([url, options]) => url === "/api/stores/store-id" && options?.method === "PUT");
    expect(updateCall?.[1]).toEqual(
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token"
        }),
        body: JSON.stringify({
          name: "Yugi Local Store",
          sourceCreditText: "YugiLocal",
          backgroundColor: "#223344",
          primaryLogoAssetId: "primary-logo-id",
          secondaryLogoAssetId: null,
          backgroundImageAssetId: null
        })
      })
    );
    expect(await screen.findByText(/configuracion de tienda actualizada/i)).toBeInTheDocument();
  });

  it("lets root create the first store from configuration without selecting an existing store", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        accessToken: "jwt-token",
        expiresIn: "1d",
        user: {
          id: "root-id",
          username: "root",
          displayName: "Root",
          storeId: null,
          isRoot: true,
          mustChangePassword: false,
          roles: ["root"]
        }
      })
    );
    await queueVisibleTournaments();
    await queueStoreList([]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        id: "store-created-id",
        name: "Virtual Really World",
        primaryLogoAssetId: null,
        secondaryLogoAssetId: null,
        backgroundImageAssetId: null,
        backgroundColor: "#10131a",
        sourceCreditText: null
      })
    );

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "root");
    await user.type(screen.getByLabelText(/contrasena/i), "ChangedPassword123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    await user.click(await screen.findByRole("button", { name: /tienda/i }));

    expect(await screen.findByText(/no hay tiendas creadas/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/nombre de tienda/i), "Virtual Really World");
    await user.click(screen.getByRole("button", { name: /crear tienda/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-token"
        }),
        body: JSON.stringify({
          name: "Virtual Really World",
          sourceCreditText: null,
          backgroundColor: "#10131a"
        })
      })
    );
    expect(await screen.findByText(/tienda virtual really world creada/i)).toBeInTheDocument();
  });

  it("uploads store logos and a custom background as permanent assets", async () => {
    const user = userEvent.setup();
    const logoFile = new File(["logo"], "logo.png", { type: "image/png" });
    const backgroundFile = new File(["background"], "background.webp", { type: "image/webp" });
    await loginAndOpenStoreConfiguration(user);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        id: "store-id",
        name: "Ready For Duel",
        primaryLogoAssetId: null,
        secondaryLogoAssetId: null,
        backgroundImageAssetId: null,
        backgroundColor: "#10131a",
        sourceCreditText: "ReadyForDuel",
        socialLinks: [],
        eventTypes: [],
        tournamentTypes: []
      })
    );
    await queueStoreAssets([]);
    await queueStoreAssets([]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        imageAssetId: "primary-logo-id",
        category: "STORE_LOGO",
        storagePath: "store-logos/primary-logo-id.png",
        retentionPolicy: "PERMANENT"
      })
    );
    await queueStoreAssets([{ id: "primary-logo-id", category: "STORE_LOGO", originalFilename: "logo.png", storagePath: "store-logos/primary-logo-id.png" }]);
    await queueStoreAssets([]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        imageAssetId: "background-id",
        category: "BACKGROUND_IMAGE",
        storagePath: "background-images/background-id.webp",
        retentionPolicy: "PERMANENT"
      })
    );
    await queueStoreAssets([{ id: "primary-logo-id", category: "STORE_LOGO", originalFilename: "logo.png", storagePath: "store-logos/primary-logo-id.png" }]);
    await queueStoreAssets([{ id: "background-id", category: "BACKGROUND_IMAGE", originalFilename: "background.webp", storagePath: "background-images/background-id.webp" }]);

    await user.click(screen.getByRole("button", { name: /consultar/i }));
    await screen.findByLabelText(/nombre de tienda/i);

    const imageInputs = screen.getAllByLabelText(/^imagen$/i);
    const uploadButtons = screen.getAllByRole("button", { name: /subir/i });

    await user.upload(imageInputs[0], logoFile);
    await user.click(uploadButtons[0]);
    await user.upload(imageInputs[2], backgroundFile);
    await user.click(uploadButtons[2]);

    await waitFor(() => {
      const uploadCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/stores/store-id/assets");
      expect(uploadCalls).toHaveLength(2);
    });

    const uploadCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/stores/store-id/assets");
    const logoBody = uploadCalls[0]?.[1]?.body as FormData;
    const backgroundBody = uploadCalls[1]?.[1]?.body as FormData;
    expect(logoBody.get("category")).toBe("STORE_LOGO");
    expect(logoBody.get("image")).toBe(logoFile);
    expect(backgroundBody.get("category")).toBe("BACKGROUND_IMAGE");
    expect(backgroundBody.get("image")).toBe(backgroundFile);
    expect(await screen.findByText(/background_image cargado como asset permanente/i)).toBeInTheDocument();
  });

  it("loads events and tournaments from catalogs", async () => {
    const user = userEvent.setup();
    await loginAndOpenCatalogs(user);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse([
        {
          id: "event-type-id",
          storeId: "store-id",
          name: "Regional",
          description: "WCQ Regional",
          logoAssetId: "event-logo-id",
          isActive: true
        }
      ])
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse([
        {
          id: "tournament-id",
          storeId: "store-id",
          eventTypeId: "event-type-id",
          eventType: { id: "event-type-id", name: "Regional" },
          name: "Torneo Local",
          description: "Torneo semanal",
          logoAssetId: null,
          eventDate: "2026-05-21T00:00:00.000Z",
          status: "OPEN",
          decks: [],
          _count: { decks: 0 }
        }
      ])
    );

    await user.click(screen.getByRole("button", { name: /consultar/i }));

    expect(await screen.findByText(/catalogos de tienda cargados/i)).toBeInTheDocument();
    expect(screen.getByText(/wcq regional/i)).toBeInTheDocument();
    expect(screen.getByText(/torneo local/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores/store-id/event-types",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token"
        })
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores/store-id/tournaments",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token"
        })
      })
    );
  });

  it("creates events with direct logo upload and tournaments from an event modal", async () => {
    const user = userEvent.setup();
    const eventLogoFile = new File(["event-logo"], "regional.png", { type: "image/png" });
    const tournamentLogoFile = new File(["tournament-logo"], "local.png", { type: "image/png" });
    await loginAndOpenCatalogs(user);
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        imageAssetId: "event-logo-id",
        category: "EVENT_LOGO",
        storagePath: "event-logos/regional.png",
        retentionPolicy: "PERMANENT"
      })
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        id: "event-type-id",
        storeId: "store-id",
        name: "Regional",
        description: "WCQ Regional",
        logoAssetId: "event-logo-id",
        isActive: true
      })
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        imageAssetId: "tournament-logo-id",
        category: "TOURNAMENT_LOGO",
        storagePath: "tournament-logos/local.png",
        retentionPolicy: "PERMANENT"
      })
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        id: "tournament-id",
        storeId: "store-id",
        eventTypeId: "event-type-id",
        name: "Torneo Local",
        description: "Torneo semanal",
        logoAssetId: "tournament-logo-id",
        eventDate: "2026-05-21T00:00:00.000Z",
        location: "Bogota",
        status: "OPEN",
        decks: [],
        _count: { decks: 0 }
      })
    );

    await user.click(screen.getByRole("button", { name: /consultar/i }));
    await screen.findByText(/catalogos de tienda cargados/i);

    await user.type(screen.getByLabelText(/evento nombre/i), "Regional");
    await user.type(screen.getByLabelText(/evento descripcion/i), "WCQ Regional");
    await user.upload(screen.getByLabelText(/evento logo/i), eventLogoFile);
    await user.click(screen.getByRole("button", { name: /crear evento/i }));

    await screen.findByText(/evento regional creado/i);
    await user.click(screen.getByRole("button", { name: /crear torneo/i }));
    const tournamentDialog = await screen.findByRole("dialog", { name: /crear torneo - regional/i });
    expect(tournamentDialog).toBeInTheDocument();
    await user.type(within(tournamentDialog).getByLabelText(/torneo nombre/i), "Torneo Local");
    await user.type(within(tournamentDialog).getByLabelText(/torneo descripcion/i), "Torneo semanal");
    await user.type(within(tournamentDialog).getByLabelText(/^fecha$/i), "2026-05-21");
    await user.type(within(tournamentDialog).getByLabelText(/ubicacion/i), "Bogota");
    await user.upload(within(tournamentDialog).getByLabelText(/torneo logo/i), tournamentLogoFile);
    await user.click(within(tournamentDialog).getByRole("button", { name: /crear torneo/i }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url, options]) => url === "/api/stores/store-id/event-types" && options?.method === "POST")).toBe(true);
      expect(fetchMock.mock.calls.some(([url, options]) => url === "/api/stores/store-id/tournaments" && options?.method === "POST")).toBe(true);
    });

    const uploadCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/stores/store-id/assets");
    expect(uploadCalls).toHaveLength(2);
    expect((uploadCalls[0]?.[1]?.body as FormData).get("category")).toBe("EVENT_LOGO");
    expect((uploadCalls[0]?.[1]?.body as FormData).get("image")).toBe(eventLogoFile);
    expect((uploadCalls[1]?.[1]?.body as FormData).get("category")).toBe("TOURNAMENT_LOGO");
    expect((uploadCalls[1]?.[1]?.body as FormData).get("image")).toBe(tournamentLogoFile);

    const eventCall = fetchMock.mock.calls.find(([url, options]) => url === "/api/stores/store-id/event-types" && options?.method === "POST");
    const tournamentCall = fetchMock.mock.calls.find(([url, options]) => url === "/api/stores/store-id/tournaments" && options?.method === "POST");
    expect(eventCall?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Regional",
          description: "WCQ Regional",
          logoAssetId: "event-logo-id",
          isActive: true
        })
      })
    );
    expect(tournamentCall?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          eventTypeId: "event-type-id",
          name: "Torneo Local",
          description: "Torneo semanal",
          logoAssetId: "tournament-logo-id",
          eventDate: "2026-05-21",
          location: "Bogota"
        })
      })
    );
    expect(await screen.findByText(/torneo torneo local creado/i)).toBeInTheDocument();
  });

  it("creates multiple store social links from store configuration with direct logo uploads", async () => {
    const user = userEvent.setup();
    const instagramLogo = new File(["instagram"], "instagram.png", { type: "image/png" });
    const facebookLogo = new File(["facebook"], "facebook.png", { type: "image/png" });
    await loginAndOpenStoreConfiguration(user);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        id: "store-id",
        name: "Ready For Duel",
        primaryLogoAssetId: null,
        secondaryLogoAssetId: null,
        backgroundImageAssetId: null,
        backgroundColor: "#10131a",
        sourceCreditText: "ReadyForDuel",
        socialLinks: []
      })
    );
    await queueStoreAssets([]);
    await queueStoreAssets([]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        imageAssetId: "instagram-logo-id",
        category: "SOCIAL_LOGO",
        storagePath: "social-logos/instagram.png",
        retentionPolicy: "PERMANENT"
      })
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        imageAssetId: "facebook-logo-id",
        category: "SOCIAL_LOGO",
        storagePath: "social-logos/facebook.png",
        retentionPolicy: "PERMANENT"
      })
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse([
        {
          id: "social-id-1",
          platform: "Instagram",
          handle: "@yugistudio",
          url: "https://instagram.com/yugistudio",
          iconAssetId: "instagram-logo-id",
          displayOrder: 1,
          isActive: true
        },
        {
          id: "social-id-2",
          platform: "Facebook",
          handle: "Yugi Studio",
          url: "https://facebook.com/yugistudio",
          iconAssetId: "facebook-logo-id",
          displayOrder: 2,
          isActive: true
        }
      ])
    );

    await user.click(screen.getByRole("button", { name: /consultar/i }));
    await screen.findByLabelText(/nombre de tienda/i);
    await user.click(screen.getByRole("button", { name: /crear redes sociales/i }));
    expect(await screen.findByRole("dialog", { name: /crear redes sociales/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/plataforma/i), "Instagram");
    await user.type(screen.getByLabelText(/handle/i), "@yugistudio");
    await user.type(screen.getByLabelText(/^url$/i), "https://instagram.com/yugistudio");
    await user.upload(screen.getByLabelText(/^logo$/i), instagramLogo);
    await user.click(screen.getByRole("button", { name: /agregar red/i }));
    const platformInputs = screen.getAllByLabelText(/plataforma/i);
    const handleInputs = screen.getAllByLabelText(/handle/i);
    const urlInputs = screen.getAllByLabelText(/^url$/i);
    const logoInputs = screen.getAllByLabelText(/^logo$/i);
    await user.type(platformInputs[1], "Facebook");
    await user.type(handleInputs[1], "Yugi Studio");
    await user.type(urlInputs[1], "https://facebook.com/yugistudio");
    await user.upload(logoInputs[1], facebookLogo);
    await user.click(screen.getByRole("button", { name: /guardar redes/i }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url, options]) => url === "/api/stores/store-id/social-links" && options?.method === "PUT")).toBe(true);
    });

    const uploadCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/stores/store-id/assets");
    expect(uploadCalls).toHaveLength(2);
    expect((uploadCalls[0]?.[1]?.body as FormData).get("category")).toBe("SOCIAL_LOGO");
    expect((uploadCalls[0]?.[1]?.body as FormData).get("image")).toBe(instagramLogo);
    expect((uploadCalls[1]?.[1]?.body as FormData).get("category")).toBe("SOCIAL_LOGO");
    expect((uploadCalls[1]?.[1]?.body as FormData).get("image")).toBe(facebookLogo);

    const socialCall = fetchMock.mock.calls.find(([url, options]) => url === "/api/stores/store-id/social-links" && options?.method === "PUT");
    expect(socialCall?.[1]).toEqual(
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          links: [
            {
              platform: "Instagram",
              handle: "@yugistudio",
              url: "https://instagram.com/yugistudio",
              iconAssetId: "instagram-logo-id",
              displayOrder: 1,
              isActive: true
            },
            {
              platform: "Facebook",
              handle: "Yugi Studio",
              url: "https://facebook.com/yugistudio",
              iconAssetId: "facebook-logo-id",
              displayOrder: 2,
              isActive: true
            }
          ]
        })
      })
    );
    expect(await screen.findByText(/2 redes sociales guardadas/i)).toBeInTheDocument();
  });

  it("generates and previews the final deck image", async () => {
    const user = userEvent.setup();
    await loginAndOpenDecks(user, [confirmedDeckSummary()]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        cached: [],
        alreadyCached: [
          {
            cardId: "card-id",
            officialName: "Blue-Eyes White Dragon",
            imageAssetId: "card-asset-id",
            storagePath: "card-images/blue-eyes.jpg"
          }
        ],
        missing: []
      })
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        generatedImageId: "generated-id",
        imageAssetId: "asset-id",
        storagePath: "generated-deck-images/deck.png",
        width: 1080,
        height: 1350,
        mimeType: "image/png",
        status: "IMAGE_GENERATED"
      })
    );
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([{ ...confirmedDeckSummary(), status: "IMAGE_GENERATED" }]));

    await user.click(screen.getByRole("button", { name: /generar imagen/i }));

    expect(await screen.findByRole("dialog", { name: /imagen del deck/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => url === "/api/decks/deck-id/cache-card-images")).toBe(true);
      expect(fetchMock.mock.calls.some(([url]) => url === "/api/decks/deck-id/generate-image")).toBe(true);
    });

    const generateCall = fetchMock.mock.calls.find(([url]) => url === "/api/decks/deck-id/generate-image");
    expect(generateCall?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer operator-token"
        })
      })
    );
    expect(await screen.findByText(/imagen generada 1080x1350/i)).toBeInTheDocument();
    expect(screen.getByAltText(/imagen generada del deck/i)).toHaveAttribute(
      "src",
      "/images/generated-deck-images/deck.png"
    );
  });

  it("opens image generation as a full mobile view instead of a desktop modal", async () => {
    setMobileViewport();
    const user = userEvent.setup();
    await loginAndOpenDecks(user, [confirmedDeckSummary()]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        cached: [],
        alreadyCached: [],
        missing: []
      })
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        generatedImageId: "generated-id",
        imageAssetId: "asset-id",
        storagePath: "generated-deck-images/deck.png",
        width: 1080,
        height: 1350,
        mimeType: "image/png",
        status: "IMAGE_GENERATED"
      })
    );
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([{ ...confirmedDeckSummary(), status: "IMAGE_GENERATED" }]));

    await user.click(screen.getByRole("button", { name: /generar imagen/i }));

    expect(await screen.findByRole("heading", { name: /white forest/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /imagen del deck/i })).not.toBeInTheDocument();
    expect(await screen.findByAltText(/imagen generada del deck/i)).toBeInTheDocument();
  });

  it("exposes a PNG download link after image generation", async () => {
    const user = userEvent.setup();
    await loginAndOpenDecks(user, [confirmedDeckSummary()]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        cached: [],
        alreadyCached: [],
        missing: []
      })
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        generatedImageId: "generated-id",
        imageAssetId: "asset-id",
        storagePath: "generated-deck-images/deck.png",
        width: 1080,
        height: 1350,
        mimeType: "image/png",
        status: "IMAGE_GENERATED"
      })
    );
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([{ ...confirmedDeckSummary(), status: "IMAGE_GENERATED" }]));

    await user.click(screen.getByRole("button", { name: /generar imagen/i }));

    const downloadLink = await screen.findByRole("link", { name: /descargar png/i });
    expect(downloadLink).toHaveAttribute("href", "/images/generated-deck-images/deck.png");
    expect(downloadLink).toHaveAttribute("download");
  });

  it("shows missing cached cards before generating the final image", async () => {
    const user = userEvent.setup();
    await loginAndOpenDecks(user, [confirmedDeckSummary()]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        cached: [],
        alreadyCached: [],
        missing: [
          {
            cardId: "card-id",
            officialName: "Blue-Eyes White Dragon",
            reason: "No hay conexion a YGOPRODeck y la imagen no existe en cache."
          }
        ]
      })
    );

    await user.click(screen.getByRole("button", { name: /generar imagen/i }));

    expect(await screen.findByText(/no se genero la imagen: 1 cartas siguen faltantes/i)).toBeInTheDocument();
    expect(screen.getByText(/blue-eyes white dragon/i)).toBeInTheDocument();
    expect(screen.getByText(/no hay conexion a ygoprodeck/i)).toBeInTheDocument();

    expect(fetchMock.mock.calls.some(([url]) => url === "/api/decks/deck-id/generate-image")).toBe(false);
  });
});

function confirmedDeckSummary() {
  return {
    deckId: "deck-id",
    storeId: "store-id",
    storeName: "Ready For Duel",
    playerName: "Operator",
    deckName: "White Forest",
    tournamentId: "tournament-id",
    tournamentName: "Torneo Mes de Abril",
    tournamentStatus: "OPEN",
    resultLabel: "Top 8",
    tournamentDate: "2026-05-21T00:00:00.000Z",
    status: "REVIEWED",
    extractionStatus: "EXTRACTED",
    reviewStatus: "CONFIRMED",
    cardCount: 40,
    createdAt: "2026-05-26T00:00:00.000Z"
  };
}
