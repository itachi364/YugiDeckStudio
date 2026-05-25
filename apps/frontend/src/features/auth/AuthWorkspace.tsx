import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CalendarDays, Images, ImageUp, ListChecks, LogIn, LogOut, ShieldCheck, Store, UserPlus } from "lucide-react";
import { DeckImagePreviewWorkspace } from "../decks/DeckImagePreviewWorkspace";
import { DeckReviewWorkspace } from "../decks/DeckReviewWorkspace";
import { DeckUploadWorkspace } from "../decks/DeckUploadWorkspace";
import { SecurityWorkspace } from "../security/SecurityWorkspace";
import { EventTypesIndexWorkspace } from "../stores/EventTypesIndexWorkspace";
import { StoreCatalogsWorkspace } from "../stores/StoreCatalogsWorkspace";
import { StoreConfigurationWorkspace } from "../stores/StoreConfigurationWorkspace";
import { StoreSummary, storeApi } from "../stores/store-api";
import { AuthUser, authApi } from "./auth-api";

type AuthMode =
  | "login"
  | "register"
  | "change-password"
  | "security"
  | "events-index"
  | "deck-upload"
  | "deck-review"
  | "deck-preview"
  | "store"
  | "catalogs";

type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

const authModes: Array<{
  mode: AuthMode;
  label: string;
  icon: typeof LogIn;
}> = [
  {
    mode: "login",
    label: "Login",
    icon: LogIn
  },
  {
    mode: "register",
    label: "Registro",
    icon: UserPlus
  },
  {
    mode: "security",
    label: "Seguridad",
    icon: ShieldCheck
  },
  {
    mode: "events-index",
    label: "Eventos",
    icon: CalendarDays
  },
  {
    mode: "deck-upload",
    label: "Decks",
    icon: ImageUp
  },
  {
    mode: "deck-review",
    label: "Revision",
    icon: ListChecks
  },
  {
    mode: "deck-preview",
    label: "Imagen",
    icon: Images
  },
  {
    mode: "store",
    label: "Tienda",
    icon: Store
  },
  {
    mode: "catalogs",
    label: "Catalogos",
    icon: CalendarDays
  }
];

export function AuthWorkspace() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleModeChange = (nextMode: AuthMode) => {
    if (mustChangePassword) {
      return;
    }

    setMode(nextMode);
    setFeedback(null);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runRequest(async () => {
      const result = await authApi.login({
        username: String(formData.get("username") ?? ""),
        password: String(formData.get("password") ?? "")
      });

      setSession({
        accessToken: result.accessToken,
        user: result.user
      });

      if (result.user.mustChangePassword) {
        setMode("change-password");
        setFeedback({
          tone: "error",
          message: "Debes cambiar la contrasena antes de continuar."
        });
        return;
      }

      setFeedback({
        tone: "success",
        message: `Sesion iniciada para ${result.user.displayName}.`
      });
      setMode(getDefaultAuthenticatedMode(result.user));
    });
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    await runRequest(async () => {
      const result = await authApi.register({
        storeId: String(formData.get("storeId") ?? ""),
        username: String(formData.get("username") ?? ""),
        password: String(formData.get("password") ?? ""),
        displayName: String(formData.get("displayName") ?? ""),
        ...(email ? { email } : {})
      });

      setFeedback({
        tone: "success",
        message: `Usuario ${result.username} registrado como ${result.roles.join(", ")}.`
      });
    });
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      setFeedback({
        tone: "error",
        message: "Debes iniciar sesion antes de cambiar la contrasena."
      });
      return;
    }

    const formData = new FormData(event.currentTarget);

    await runRequest(async () => {
      const result = await authApi.changePassword({
        accessToken: session.accessToken,
        currentPassword: String(formData.get("currentPassword") ?? ""),
        newPassword: String(formData.get("newPassword") ?? "")
      });

      setSession({
        ...session,
        user: {
          ...session.user,
          mustChangePassword: result.mustChangePassword
        }
      });
      setFeedback({
        tone: "success",
        message: "Contrasena actualizada."
      });
      setMode(getDefaultAuthenticatedMode({ ...session.user, mustChangePassword: result.mustChangePassword }));
    });
  };

  const runRequest = async (request: () => Promise<void>) => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      await request();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "La solicitud no pudo completarse."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const mustChangePassword = session?.user.mustChangePassword ?? false;
  const visibleMode = mustChangePassword ? "change-password" : mode;
  const navigationItems = getNavigationItems(session, mustChangePassword);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegacion principal">
        <div>
          <p className="eyebrow">YugiDeckStudio</p>
          <h1>Acceso local</h1>
        </div>
        <nav aria-label="Flujos de autenticacion">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = visibleMode === item.mode;

            return (
              <button
                aria-pressed={isActive}
                className="nav-button"
                key={item.mode}
                type="button"
                onClick={() => handleModeChange(item.mode)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">v0.1.0</p>
            <h2>{getTitle(visibleMode)}</h2>
          </div>
          <SessionBadge
            session={session}
            onLogout={() => {
              setSession(null);
              setMode("login");
              setFeedback(null);
            }}
          />
        </header>

        {feedback ? (
          <div className={`feedback ${feedback.tone}`} role="status">
            {feedback.tone === "error" ? <AlertCircle size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
            <span>{feedback.message}</span>
          </div>
        ) : null}

        {visibleMode === "login" ? (
          <LoginForm isSubmitting={isSubmitting} onSubmit={handleLogin} />
        ) : null}

        {visibleMode === "register" ? (
          <RegisterForm accessToken={session?.accessToken} isSubmitting={isSubmitting} onSubmit={handleRegister} />
        ) : null}

        {visibleMode === "change-password" ? (
          <ChangePasswordForm
            isSubmitting={isSubmitting}
            isSessionReady={Boolean(session)}
            onSubmit={handleChangePassword}
          />
        ) : null}

        {visibleMode === "security" && session ? (
          <SecurityWorkspace accessToken={session.accessToken} />
        ) : null}

        {visibleMode === "events-index" && session ? (
          <EventTypesIndexWorkspace
            accessToken={session.accessToken}
            defaultStoreId={session.user.storeId}
            isRoot={session.user.isRoot}
            roles={session.user.roles}
          />
        ) : null}

        {visibleMode === "deck-upload" && session ? (
          <DeckUploadWorkspace accessToken={session.accessToken} defaultStoreId={session.user.storeId} />
        ) : null}

        {visibleMode === "deck-review" && session ? (
          <DeckReviewWorkspace accessToken={session.accessToken} />
        ) : null}

        {visibleMode === "deck-preview" && session ? (
          <DeckImagePreviewWorkspace accessToken={session.accessToken} />
        ) : null}

        {visibleMode === "store" && session ? (
          <StoreConfigurationWorkspace
            accessToken={session.accessToken}
            defaultStoreId={session.user.storeId}
            isRoot={session.user.isRoot}
          />
        ) : null}

        {visibleMode === "catalogs" && session ? (
          <StoreCatalogsWorkspace accessToken={session.accessToken} defaultStoreId={session.user.storeId} />
        ) : null}
      </section>
    </main>
  );
}

function getTitle(mode: AuthMode): string {
  if (mode === "register") {
    return "Registro de operador";
  }

  if (mode === "change-password") {
    return "Cambiar contrasena";
  }

  if (mode === "security") {
    return "Seguridad local";
  }

  if (mode === "events-index") {
    return "Eventos configurados";
  }

  if (mode === "deck-upload") {
    return "Carga de deck";
  }

  if (mode === "deck-review") {
    return "Revision de extraccion";
  }

  if (mode === "deck-preview") {
    return "Imagen generada";
  }

  if (mode === "store") {
    return "Configuracion de tienda";
  }

  if (mode === "catalogs") {
    return "Catalogos y redes";
  }

  return "Login local";
}

function SessionBadge({
  session,
  onLogout
}: {
  session: AuthSession | null;
  onLogout: () => void;
}) {
  if (!session) {
    return <span className="mode-pill">Sin sesion</span>;
  }

  return (
    <div className="session-badge">
      <div>
        <strong>{session.user.displayName}</strong>
        <span>{session.user.roles.join(", ")}</span>
      </div>
      <button aria-label="Cerrar sesion" className="icon-button" type="button" onClick={onLogout}>
        <LogOut size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

function LoginForm({
  isSubmitting,
  onSubmit
}: {
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form aria-label="Login local" className="auth-form" onSubmit={onSubmit}>
      <label>
        Usuario
        <input autoComplete="username" name="username" required type="text" />
      </label>
      <label>
        Contrasena
        <input autoComplete="current-password" name="password" required type="password" />
      </label>
      <button className="primary-button" disabled={isSubmitting} type="submit">
        <LogIn size={18} aria-hidden="true" />
        <span>{isSubmitting ? "Validando" : "Entrar"}</span>
      </button>
    </form>
  );
}

function RegisterForm({
  accessToken,
  isSubmitting,
  onSubmit
}: {
  accessToken?: string;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [stores, setStores] = useState<StoreSummary[]>([]);

  useEffect(() => {
    if (!accessToken) {
      setStores([]);
      return;
    }

    storeApi.listStores(accessToken).then(setStores).catch(() => setStores([]));
  }, [accessToken]);

  return (
    <form aria-label="Registro de operador" className="auth-form two-column" onSubmit={onSubmit}>
      <label>
        Tienda
        <select name="storeId" required>
          <option value="">Selecciona una tienda</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Usuario
        <input autoComplete="username" name="username" required type="text" />
      </label>
      <label>
        Nombre visible
        <input name="displayName" required type="text" />
      </label>
      <label>
        Email
        <input autoComplete="email" name="email" type="email" />
      </label>
      <label className="full-width">
        Contrasena
        <input autoComplete="new-password" minLength={8} name="password" required type="password" />
      </label>
      <button className="primary-button full-width" disabled={isSubmitting} type="submit">
        <UserPlus size={18} aria-hidden="true" />
        <span>{isSubmitting ? "Registrando" : "Registrar"}</span>
      </button>
    </form>
  );
}

function ChangePasswordForm({
  isSubmitting,
  isSessionReady,
  onSubmit
}: {
  isSubmitting: boolean;
  isSessionReady: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form aria-label="Cambiar contrasena" className="auth-form" onSubmit={onSubmit}>
      <label>
        Contrasena actual
        <input autoComplete="current-password" disabled={!isSessionReady} name="currentPassword" required type="password" />
      </label>
      <label>
        Nueva contrasena
        <input autoComplete="new-password" disabled={!isSessionReady} minLength={8} name="newPassword" required type="password" />
      </label>
      <button className="primary-button" disabled={isSubmitting || !isSessionReady} type="submit">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>{isSubmitting ? "Actualizando" : "Actualizar"}</span>
      </button>
    </form>
  );
}

function getNavigationItems(session: AuthSession | null, mustChangePassword: boolean) {
  if (mustChangePassword) {
    return [];
  }

  if (!session) {
    return authModes.filter((item) => item.mode === "login");
  }

  const allowedModes: AuthMode[] = ["events-index", "deck-upload", "deck-review", "deck-preview"];

  if (session.user.isRoot) {
    allowedModes.push("register", "security", "store", "catalogs");
  } else if (session.user.roles.includes("store_admin")) {
    allowedModes.push("store", "catalogs");
  }

  return authModes.filter((item) => allowedModes.includes(item.mode));
}

function getDefaultAuthenticatedMode(user: AuthUser): AuthMode {
  if (user.mustChangePassword) {
    return "change-password";
  }

  if (user.isRoot) {
    return "events-index";
  }

  return "events-index";
}
