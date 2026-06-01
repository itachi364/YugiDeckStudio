import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarPlus, Plus, Search, ShieldCheck, Trophy, X } from "lucide-react";
import {
  ConfigureStoreCatalogInput,
  ConfigureTournamentInput,
  StoreEventType,
  StoreSummary,
  StoreTournament,
  storeApi
} from "./store-api";

type StoreCatalogsWorkspaceProps = {
  accessToken: string;
  defaultStoreId?: string | null;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

export function StoreCatalogsWorkspace({ accessToken, defaultStoreId }: StoreCatalogsWorkspaceProps) {
  const [storeId, setStoreId] = useState(defaultStoreId ?? "");
  const [eventTypes, setEventTypes] = useState<StoreEventType[]>([]);
  const [tournaments, setTournaments] = useState<StoreTournament[]>([]);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<StoreEventType | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isWorking, setIsWorking] = useState(false);

  const normalizedStoreId = storeId.trim();

  const runStoreAction = async (action: () => Promise<void>) => {
    if (!normalizedStoreId) {
      setFeedback({
        tone: "error",
        message: "La tienda es obligatoria para configurar eventos y torneos."
      });
      return;
    }

    setIsWorking(true);
    setFeedback(null);

    try {
      await action();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No fue posible completar la accion."
      });
    } finally {
      setIsWorking(false);
    }
  };

  const loadStores = useCallback(async () => {
    try {
      const result = await storeApi.listStores(accessToken);
      setStores(result);
      if (!storeId && result.length === 1) {
        setStoreId(result[0].id);
      }
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No fue posible cargar las tiendas."
      });
    }
  }, [accessToken, storeId]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  const uploadLogo = async (category: "EVENT_LOGO" | "TOURNAMENT_LOGO", image: File) => {
    const result = await storeApi.uploadStoreAsset(accessToken, normalizedStoreId, category, image);
    return result.imageAssetId;
  };

  const handleLoadConfiguration = () =>
    runStoreAction(async () => {
      const [events, loadedTournaments] = await Promise.all([
        storeApi.listEventTypes(accessToken, normalizedStoreId),
        storeApi.listTournaments(accessToken, normalizedStoreId)
      ]);

      setEventTypes(events);
      setTournaments(loadedTournaments);
      setFeedback({
        tone: "success",
        message: "Catalogos de tienda cargados."
      });
    });

  const handleCreateEventType = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = readCatalogForm(form);
    const logoFile = readOptionalFile(form, "logoFile");

    void runStoreAction(async () => {
      const logoAssetId = logoFile ? await uploadLogo("EVENT_LOGO", logoFile) : null;
      const result = await storeApi.createEventType(accessToken, normalizedStoreId, {
        ...input,
        logoAssetId
      });
      setEventTypes((current) => [...current, result]);
      form.reset();
      setFeedback({
        tone: "success",
        message: `Evento ${result.name} creado.`
      });
    });
  };

  const handleCreateTournament = async (input: ConfigureTournamentInput) =>
    runStoreAction(async () => {
      const result = await storeApi.createTournament(accessToken, normalizedStoreId, input);
      setTournaments((current) => [...current, result]);
      setSelectedEvent(null);
      setFeedback({
        tone: "success",
        message: `Torneo ${result.name} creado.`
      });
    });

  return (
    <div className="store-catalogs-layout">
      <div className="section-header">
        <div>
          <p className="eyebrow">Catalogos</p>
          <h3>Eventos y torneos</h3>
        </div>
      </div>

      {feedback ? (
        <div className={`feedback ${feedback.tone}`} role="status">
          {feedback.tone === "error" ? <AlertCircle size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <section className="data-panel" aria-label="Seleccion de tienda para catalogos">
        <div className="review-actions">
          <label>
            Tienda
            <select
              name="storeId"
              required
              value={storeId}
              onChange={(event) => {
                setStoreId(event.currentTarget.value);
                setEventTypes([]);
                setTournaments([]);
                setSelectedEvent(null);
              }}
            >
              <option value="">Selecciona una tienda</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-button" disabled={isWorking} type="button" onClick={handleLoadConfiguration}>
            <Search size={18} aria-hidden="true" />
            <span>{isWorking ? "Consultando" : "Consultar"}</span>
          </button>
        </div>
      </section>

      <div className="catalogs-grid">
        <section className="data-panel" aria-label="Eventos">
          <div className="section-header">
            <h4>Eventos</h4>
            <CalendarPlus size={20} aria-hidden="true" />
          </div>
          <CatalogList emptyText="Sin eventos." items={eventTypes} onCreateTournament={setSelectedEvent} />
          <CatalogForm buttonLabel="Crear evento" isWorking={isWorking} labelPrefix="Evento" onSubmit={handleCreateEventType} />
        </section>

        <section className="data-panel" aria-label="Torneos">
          <div className="section-header">
            <h4>Torneos</h4>
            <Trophy size={20} aria-hidden="true" />
          </div>
          <TournamentList items={tournaments} />
          <p className="empty-state">Crea torneos desde la fila del evento correspondiente.</p>
        </section>
      </div>

      {selectedEvent ? (
        <ResponsiveModal title={`Crear torneo - ${selectedEvent.name}`} onClose={() => setSelectedEvent(null)}>
          <TournamentForm
            eventType={selectedEvent}
            isWorking={isWorking}
            onSubmit={handleCreateTournament}
            onUploadLogo={(image) => uploadLogo("TOURNAMENT_LOGO", image)}
          />
        </ResponsiveModal>
      ) : null}
    </div>
  );
}

function CatalogForm({
  buttonLabel,
  isWorking,
  labelPrefix,
  onSubmit
}: {
  buttonLabel: string;
  isWorking: boolean;
  labelPrefix: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="catalog-form" aria-label={buttonLabel} onSubmit={onSubmit}>
      <label>
        {labelPrefix} nombre
        <input name="name" required type="text" />
      </label>
      <label>
        {labelPrefix} descripcion
        <input name="description" type="text" />
      </label>
      <label>
        {labelPrefix} logo
        <input accept="image/jpeg,image/png,image/webp" name="logoFile" type="file" />
      </label>
      <label className="inline-check catalog-check">
        <input defaultChecked name="isActive" type="checkbox" />
        Activo
      </label>
      <button className="secondary-button" disabled={isWorking} type="submit">
        <Plus size={18} aria-hidden="true" />
        <span>{buttonLabel}</span>
      </button>
    </form>
  );
}

function TournamentForm({
  eventType,
  isWorking,
  onSubmit,
  onUploadLogo
}: {
  eventType: StoreEventType;
  isWorking: boolean;
  onSubmit: (input: ConfigureTournamentInput) => Promise<void>;
  onUploadLogo: (image: File) => Promise<string>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsUploadingLogo(true);
    try {
      const logoAssetId = logoFile ? await onUploadLogo(logoFile) : null;
      await onSubmit({
        eventTypeId: eventType.id,
        name,
        description: emptyToNull(description),
        logoAssetId,
        eventDate,
        location: emptyToNull(location)
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  return (
    <form className="catalog-form" aria-label="Crear torneo" onSubmit={(event) => void handleSubmit(event)}>
      <p className="empty-state">Evento seleccionado: {eventType.name}</p>
      <label>
        Torneo nombre
        <input required type="text" value={name} onChange={(event) => setName(event.currentTarget.value)} />
      </label>
      <label>
        Torneo descripcion
        <input type="text" value={description} onChange={(event) => setDescription(event.currentTarget.value)} />
      </label>
      <label>
        Fecha
        <input required type="date" value={eventDate} onChange={(event) => setEventDate(event.currentTarget.value)} />
      </label>
      <label>
        Ubicacion
        <input type="text" value={location} onChange={(event) => setLocation(event.currentTarget.value)} />
      </label>
      <label>
        Torneo logo
        <input
          accept="image/jpeg,image/png,image/webp"
          type="file"
          onChange={(event) => setLogoFile(event.currentTarget.files?.[0] ?? null)}
        />
      </label>
      <button className="secondary-button" disabled={isWorking || isUploadingLogo} type="submit">
        <Plus size={18} aria-hidden="true" />
        <span>{isUploadingLogo ? "Subiendo logo" : "Crear torneo"}</span>
      </button>
    </form>
  );
}

function CatalogList({
  emptyText,
  items,
  onCreateTournament
}: {
  emptyText: string;
  items: StoreEventType[];
  onCreateTournament: (eventType: StoreEventType) => void;
}) {
  if (items.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <div className="table-list">
      {items.map((item) => (
        <article className="table-row catalog-event-row" key={item.id}>
          <div>
            <strong>{item.name}</strong>
            <span>{item.description || "Sin descripcion"}</span>
          </div>
          <span>{item.logoAssetId || "Sin logo"}</span>
          <span>{item.isActive ? "Activo" : "Inactivo"}</span>
          <button className="secondary-button" type="button" onClick={() => onCreateTournament(item)}>
            <Plus size={18} aria-hidden="true" />
            <span>Crear torneo</span>
          </button>
        </article>
      ))}
    </div>
  );
}

function TournamentList({ items }: { items: StoreTournament[] }) {
  if (items.length === 0) {
    return <p className="empty-state">Sin torneos.</p>;
  }

  return (
    <div className="table-list">
      {items.map((item) => (
        <article className="table-row" key={item.id}>
          <div>
            <strong>{item.name}</strong>
            <span>{item.eventType?.name ?? "Sin evento asociado"}</span>
          </div>
          <span>{item.logoAssetId || "Sin logo"}</span>
          <span>{item.status === "OPEN" ? "Abierto" : "Cerrado"}</span>
        </article>
      ))}
    </div>
  );
}

function readCatalogForm(form: HTMLFormElement): ConfigureStoreCatalogInput {
  const formData = new FormData(form);

  return {
    name: String(formData.get("name") ?? ""),
    description: emptyToNull(String(formData.get("description") ?? "")),
    logoAssetId: null,
    isActive: formData.get("isActive") === "on"
  };
}

function readOptionalFile(form: HTMLFormElement, field: string): File | null {
  const input = form.elements.namedItem(field);
  if (!(input instanceof HTMLInputElement)) {
    return null;
  }

  const file = input.files?.[0] ?? null;
  return file && file.size > 0 ? file : null;
}

function emptyToNull(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}

function ResponsiveModal({
  title,
  children,
  onClose
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label={title} aria-modal="true" className="modal-surface" role="dialog">
        <header className="modal-header">
          <h3>{title}</h3>
          <button aria-label="Cerrar modal" className="icon-button" type="button" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
