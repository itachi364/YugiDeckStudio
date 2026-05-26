import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const fetchMock = vi.fn();

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

async function queueVisibleEventTypes(events: unknown[] = []) {
  fetchMock.mockResolvedValueOnce(await mockJsonResponse(events));
}

async function queueStoreList(stores: unknown[] = [{ id: "store-id", name: "Ready For Duel" }]) {
  fetchMock.mockResolvedValueOnce(await mockJsonResponse(stores));
}

async function queueStoreAssets(assets: unknown[] = []) {
  fetchMock.mockResolvedValueOnce(await mockJsonResponse(assets));
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
  await queueVisibleEventTypes();
  await queueStoreList();
  fetchMock.mockResolvedValueOnce(await mockJsonResponse(decks));
  fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
  fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));

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
  await queueVisibleEventTypes();
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
  await queueVisibleEventTypes();
  await queueStoreList();

  renderApp();

  await user.type(screen.getByLabelText(/usuario/i), "admin");
  await user.type(screen.getByLabelText(/contrasena/i), "Admin123!");
  await user.click(screen.getByRole("button", { name: /entrar/i }));
  await user.click(await screen.findByRole("button", { name: /catalogos/i }));

  expect(await screen.findByRole("heading", { name: /catalogos y redes/i })).toBeInTheDocument();
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
    localStorage.clear();
    setDesktopViewport();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    await queueVisibleEventTypes();
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

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          storeId: "store-id",
          username: "operator1",
          password: "Operator123!",
          displayName: "Operator One",
          email: "operator@example.com"
        })
      })
    );
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
    await queueVisibleEventTypes();

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
        }),
        body: JSON.stringify({
          currentPassword: "ChangeMe123!",
          newPassword: "NewPassword123!"
        })
      })
    );
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
    await queueVisibleEventTypes();
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
    await queueVisibleEventTypes();

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
    await queueVisibleEventTypes();

    await user.type(screen.getByLabelText(/usuario/i), "root");
    await user.type(screen.getByLabelText(/contrasena/i), "ChangedPassword123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("heading", { name: /eventos configurados/i })).toBeInTheDocument();
    expect(localStorage.getItem("yugideckstudio.session")).toContain("jwt-token");

    firstRender.unmount();
    await queueVisibleEventTypes();
    renderApp();

    expect(await screen.findByRole("heading", { name: /eventos configurados/i })).toBeInTheDocument();
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
    await queueVisibleEventTypes();
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
    await queueVisibleEventTypes([
      {
        id: "event-type-id",
        storeId: "store-id",
        name: "Regional",
        description: "WCQ Regional",
        logoAssetId: null,
        isActive: true
      }
    ]);

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "operator");
    await user.type(screen.getByLabelText(/contrasena/i), "Operator123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("heading", { name: /eventos configurados/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /seguridad/i })).not.toBeInTheDocument();
    expect(screen.getByText(/^regional$/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /eliminar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eventos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decks/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /revision/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^imagen$/i })).not.toBeInTheDocument();
  });

  it("loads the configured events index after login", async () => {
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
    await queueVisibleEventTypes([
      {
        id: "event-type-id",
        storeId: "store-id",
        name: "Regional",
        description: "WCQ Regional",
        logoAssetId: null,
        isActive: true
      }
    ]);

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "operator");
    await user.type(screen.getByLabelText(/contrasena/i), "Operator123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("heading", { name: /eventos configurados/i })).toBeInTheDocument();
    expect(screen.getByText(/eventos visibles/i)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/wcq regional/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores/event-types",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer operator-token"
        })
      })
    );
  });

  it("lets operators create and modify events without exposing delete", async () => {
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
    await queueVisibleEventTypes([
      {
        id: "event-type-id",
        storeId: "store-id",
        name: "Regional",
        description: "WCQ Regional",
        logoAssetId: null,
        isActive: true
      }
    ]);
    await queueStoreList();
    await queueStoreAssets([{ id: "event-logo-id", category: "EVENT_LOGO", originalFilename: "regional.png", storagePath: "event-logos/regional.png" }]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        id: "event-type-created",
        storeId: "store-id",
        name: "Premiere",
        description: "Premiere local",
        logoAssetId: "event-logo-id",
        isActive: true
      })
    );
    await queueStoreList();
    await queueStoreAssets([]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        id: "event-type-id",
        storeId: "store-id",
        name: "Regional WCQ",
        description: "Regional actualizado",
        logoAssetId: null,
        isActive: true
      })
    );

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "operator");
    await user.type(screen.getByLabelText(/contrasena/i), "Operator123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    await screen.findByRole("heading", { name: /eventos configurados/i });

    expect(screen.queryByRole("button", { name: /eliminar/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /crear evento/i }));
    await user.type(screen.getByLabelText(/^nombre$/i), "Premiere");
    await user.type(screen.getByLabelText(/^descripcion$/i), "Premiere local");
    await user.selectOptions(screen.getByLabelText(/^logo$/i), "event-logo-id");
    await user.click(screen.getByRole("button", { name: /guardar evento/i }));

    expect(await screen.findByText(/evento premiere creado/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores/store-id/event-types",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Premiere",
          description: "Premiere local",
          logoAssetId: "event-logo-id",
          isActive: true
        })
      })
    );

    await user.click(screen.getAllByRole("button", { name: /modificar/i })[0]);
    await user.clear(screen.getByLabelText(/^nombre$/i));
    await user.type(screen.getByLabelText(/^nombre$/i), "Regional WCQ");
    await user.clear(screen.getByLabelText(/^descripcion$/i));
    await user.type(screen.getByLabelText(/^descripcion$/i), "Regional actualizado");
    await user.click(screen.getByRole("button", { name: /guardar evento/i }));

    expect(await screen.findByText(/evento regional wcq actualizado/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores/store-id/event-types/event-type-id",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          name: "Regional WCQ",
          description: "Regional actualizado",
          logoAssetId: null,
          isActive: true
        })
      })
    );
  });

  it("lets root see all stores and soft delete events", async () => {
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
    await queueVisibleEventTypes([
      {
        id: "event-type-a",
        storeId: "store-a",
        store: {
          id: "store-a",
          name: "Ready For Duel"
        },
        name: "Regional",
        description: "WCQ Regional",
        logoAssetId: null,
        isActive: true
      },
      {
        id: "event-type-b",
        storeId: "store-b",
        store: {
          id: "store-b",
          name: "Yugi Local"
        },
        name: "Premiere",
        description: "Premiere local",
        logoAssetId: null,
        isActive: true
      }
    ]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        id: "event-type-a",
        storeId: "store-a",
        name: "Regional",
        description: "WCQ Regional",
        logoAssetId: null,
        isActive: false
      })
    );

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "root");
    await user.type(screen.getByLabelText(/contrasena/i), "ChangedPassword123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText(/ready for duel/i)).toBeInTheDocument();
    expect(screen.getByText(/yugi local/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /eliminar/i })[0]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores/store-a/event-types/event-type-a",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-token"
        })
      })
    );
    expect(await screen.findByText(/evento regional inactivado/i)).toBeInTheDocument();
    expect(screen.getByText(/inactivo/i)).toBeInTheDocument();
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
    await queueVisibleEventTypes();
    await queueStoreList();
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
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
    await user.type(screen.getByLabelText(/fecha del torneo/i), "2026-05-21");
    await user.type(screen.getByLabelText(/resultado/i), "Top 8");
    await user.type(screen.getByLabelText(/deck usado/i), "White Forest");
    await user.type(screen.getByLabelText(/link neuron/i), "https://neuron.konami.net/link/6omm271xgfka1d95");
    await user.type(screen.getByLabelText(/^torneo$/i), "Regional");
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
    expect(body.get("tournamentDate")).toBe("2026-05-21");
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
    await queueVisibleEventTypes();
    await queueStoreList();
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));

    renderApp();

    await user.type(screen.getByLabelText(/usuario/i), "operator");
    await user.type(screen.getByLabelText(/contrasena/i), "Operator123!");
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    await user.click(await screen.findByRole("button", { name: /decks/i }));

    await user.type(screen.getByLabelText(/jugador/i), "Kaihuang Zhang");
    await user.type(screen.getByLabelText(/fecha del torneo/i), "2026-05-21");
    await user.type(screen.getByLabelText(/resultado/i), "Top 8");
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

  it("shows confirmed review status and disables confirmation for already reviewed decks", async () => {
    const user = userEvent.setup();
    await loginAndOpenDecks(user, [confirmedDeckSummary()]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse({
        deckId: "deck-id",
        status: "REVIEWED",
        extractionStatus: "EXTRACTED",
        reviewStatus: "CONFIRMED",
        cards: buildMainDeckCards(40)
      })
    );

    await user.click(screen.getByRole("button", { name: /revisar/i }));
    await screen.findByDisplayValue("Card 1");

    expect(screen.getAllByText(/confirmed/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/la revision del deck ya fue confirmada/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar deck/i })).toBeDisabled();
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
    await queueVisibleEventTypes();
    await queueStoreList();
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse([])
    );
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
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
    await user.type(screen.getByLabelText(/fecha del torneo/i), "2026-05-21");
    await user.type(screen.getByLabelText(/resultado/i), "Top 8");
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
    await queueVisibleEventTypes();
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

  it("loads event types, tournament types and social links", async () => {
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
          id: "tournament-type-id",
          storeId: "store-id",
          name: "Local",
          description: "Torneo semanal",
          logoAssetId: null,
          isActive: true
        }
      ])
    );
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse([
        {
          id: "social-id",
          platform: "Instagram",
          handle: "@readyforduel",
          url: "https://instagram.com/readyforduel",
          iconAssetId: "social-logo-id",
          displayOrder: 1,
          isActive: true
        }
      ])
    );
    await queueStoreAssets([
      { id: "event-logo-id", category: "EVENT_LOGO", originalFilename: "regional.png", storagePath: "event-logos/regional.png" }
    ]);
    await queueStoreAssets([
      { id: "social-logo-id", category: "SOCIAL_LOGO", originalFilename: "instagram.png", storagePath: "social-logos/instagram.png" }
    ]);

    await user.click(screen.getByRole("button", { name: /consultar/i }));

    expect(await screen.findByText(/catalogos de tienda cargados/i)).toBeInTheDocument();
    expect(screen.getByText(/wcq regional/i)).toBeInTheDocument();
    expect(screen.getByText(/torneo semanal/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/@readyforduel/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores/store-id/event-types",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token"
        })
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores/store-id/tournament-types",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token"
        })
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores/store-id/social-links",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token"
        })
      })
    );
  });

  it("creates event and tournament types", async () => {
    const user = userEvent.setup();
    await loginAndOpenCatalogs(user);
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    await queueStoreAssets([
      { id: "event-logo-id", category: "EVENT_LOGO", originalFilename: "regional.png", storagePath: "event-logos/regional.png" }
    ]);
    await queueStoreAssets([]);
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
        id: "tournament-type-id",
        storeId: "store-id",
        name: "Local",
        description: "Torneo semanal",
        logoAssetId: null,
        isActive: true
      })
    );

    await user.click(screen.getByRole("button", { name: /consultar/i }));
    await screen.findByText(/catalogos de tienda cargados/i);

    await user.type(screen.getByLabelText(/evento nombre/i), "Regional");
    await user.type(screen.getByLabelText(/evento descripcion/i), "WCQ Regional");
    await user.selectOptions(screen.getByLabelText(/evento logo/i), "event-logo-id");
    await user.click(screen.getByRole("button", { name: /crear evento/i }));

    await user.type(screen.getByLabelText(/torneo nombre/i), "Local");
    await user.type(screen.getByLabelText(/torneo descripcion/i), "Torneo semanal");
    await user.click(screen.getByRole("button", { name: /crear torneo/i }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url, options]) => url === "/api/stores/store-id/event-types" && options?.method === "POST")).toBe(true);
      expect(fetchMock.mock.calls.some(([url, options]) => url === "/api/stores/store-id/tournament-types" && options?.method === "POST")).toBe(true);
    });

    const eventCall = fetchMock.mock.calls.find(([url, options]) => url === "/api/stores/store-id/event-types" && options?.method === "POST");
    const tournamentCall = fetchMock.mock.calls.find(([url, options]) => url === "/api/stores/store-id/tournament-types" && options?.method === "POST");
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
          name: "Local",
          description: "Torneo semanal",
          logoAssetId: null,
          isActive: true
        })
      })
    );
    expect(await screen.findByText(/tipo de torneo local creado/i)).toBeInTheDocument();
  });

  it("replaces store social links", async () => {
    const user = userEvent.setup();
    await loginAndOpenCatalogs(user);
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    fetchMock.mockResolvedValueOnce(await mockJsonResponse([]));
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse([
        {
          id: "social-id",
          platform: "Instagram",
          handle: "@readyforduel",
          url: "https://instagram.com/readyforduel",
          iconAssetId: "social-logo-id",
          displayOrder: 1,
          isActive: true
        }
      ])
    );
    await queueStoreAssets([]);
    await queueStoreAssets([
      { id: "social-logo-id", category: "SOCIAL_LOGO", originalFilename: "instagram.png", storagePath: "social-logos/instagram.png" }
    ]);
    fetchMock.mockResolvedValueOnce(
      await mockJsonResponse([
        {
          id: "social-id",
          platform: "Instagram",
          handle: "@yugistudio",
          url: "https://instagram.com/yugistudio",
          iconAssetId: "social-logo-id",
          displayOrder: 1,
          isActive: true
        }
      ])
    );

    await user.click(screen.getByRole("button", { name: /consultar/i }));
    await screen.findByDisplayValue(/@readyforduel/i);

    await user.clear(screen.getByLabelText(/handle/i));
    await user.type(screen.getByLabelText(/handle/i), "@yugistudio");
    await user.clear(screen.getByLabelText(/^url$/i));
    await user.type(screen.getByLabelText(/^url$/i), "https://instagram.com/yugistudio");
    await user.click(screen.getByRole("button", { name: /guardar redes/i }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url, options]) => url === "/api/stores/store-id/social-links" && options?.method === "PUT")).toBe(true);
    });

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
              iconAssetId: "social-logo-id",
              displayOrder: 1,
              isActive: true
            }
          ]
        })
      })
    );
    expect(await screen.findByText(/1 redes sociales guardadas/i)).toBeInTheDocument();
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
      "http://127.0.0.1:8081/generated-deck-images/deck.png"
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
    expect(downloadLink).toHaveAttribute("href", "http://127.0.0.1:8081/generated-deck-images/deck.png");
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
    resultLabel: "Top 8",
    tournamentDate: "2026-05-21T00:00:00.000Z",
    status: "REVIEWED",
    extractionStatus: "EXTRACTED",
    reviewStatus: "CONFIRMED",
    cardCount: 40,
    createdAt: "2026-05-26T00:00:00.000Z"
  };
}
