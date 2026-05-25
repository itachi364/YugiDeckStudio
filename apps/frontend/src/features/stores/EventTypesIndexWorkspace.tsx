import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarPlus, Edit3, Save, ShieldCheck, Trash2 } from "lucide-react";
import { ConfigureStoreCatalogInput, StoreAssetOption, StoreEventType, StoreSummary, storeApi } from "./store-api";

type EventTypesIndexWorkspaceProps = {
  accessToken: string;
  defaultStoreId?: string | null;
  isRoot: boolean;
  roles: string[];
};

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

type EventFormState = {
  id?: string;
  storeId: string;
  name: string;
  description: string;
  logoAssetId: string;
  isActive: boolean;
};

const emptyForm: EventFormState = {
  storeId: "",
  name: "",
  description: "",
  logoAssetId: "",
  isActive: true
};

export function EventTypesIndexWorkspace({
  accessToken,
  defaultStoreId,
  isRoot,
  roles
}: EventTypesIndexWorkspaceProps) {
  const [events, setEvents] = useState<StoreEventType[]>([]);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [logoAssets, setLogoAssets] = useState<StoreAssetOption[]>([]);
  const [formState, setFormState] = useState<EventFormState | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isWorking, setIsWorking] = useState(false);

  const canDelete = isRoot || roles.includes("store_admin");
  const canEditStoreId = isRoot;
  const visibleCount = useMemo(() => events.length, [events]);

  const loadEvents = useCallback(async () => {
    setIsWorking(true);
    setFeedback(null);

    try {
      const result = await storeApi.listVisibleEventTypes(accessToken);
      setEvents(result);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No fue posible cargar los eventos."
      });
    } finally {
      setIsWorking(false);
    }
  }, [accessToken]);

  const loadStores = useCallback(async () => {
    try {
      const result = await storeApi.listStores(accessToken);
      setStores(result);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No fue posible cargar las tiendas."
      });
    }
  }, [accessToken]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!formState?.storeId) {
      setLogoAssets([]);
      return;
    }

    storeApi
      .listStoreAssets(accessToken, formState.storeId, "EVENT_LOGO")
      .then(setLogoAssets)
      .catch((error: unknown) => {
        setFeedback({
          tone: "error",
          message: error instanceof Error ? error.message : "No fue posible cargar los logos de eventos."
        });
      });
  }, [accessToken, formState?.storeId]);

  const startCreate = () => {
    void loadStores();
    setFormState({
      ...emptyForm,
      storeId: defaultStoreId ?? ""
    });
    setFeedback(null);
  };

  const startEdit = (eventType: StoreEventType) => {
    void loadStores();
    setFormState({
      id: eventType.id,
      storeId: eventType.storeId ?? eventType.store?.id ?? defaultStoreId ?? "",
      name: eventType.name,
      description: eventType.description ?? "",
      logoAssetId: eventType.logoAssetId ?? "",
      isActive: eventType.isActive
    });
    setFeedback(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState) {
      return;
    }

    const storeId = formState.storeId.trim();

    if (!storeId) {
      setFeedback({
        tone: "error",
        message: "La tienda es obligatoria para crear o modificar eventos."
      });
      return;
    }

    const input: ConfigureStoreCatalogInput = {
      name: formState.name,
      description: emptyToNull(formState.description),
      logoAssetId: emptyToNull(formState.logoAssetId),
      isActive: formState.isActive
    };

    setIsWorking(true);
    setFeedback(null);

    try {
      if (formState.id) {
        const updated = await storeApi.updateEventType(accessToken, storeId, formState.id, input);
        setEvents((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
        setFeedback({
          tone: "success",
          message: `Evento ${updated.name} actualizado.`
        });
      } else {
        const created = await storeApi.createEventType(accessToken, storeId, input);
        setEvents((current) => [...current, created]);
        setFeedback({
          tone: "success",
          message: `Evento ${created.name} creado.`
        });
      }

      setFormState(null);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No fue posible guardar el evento."
      });
    } finally {
      setIsWorking(false);
    }
  };

  const handleSoftDelete = async (eventType: StoreEventType) => {
    const storeId = eventType.storeId ?? eventType.store?.id ?? "";

    if (!storeId) {
      setFeedback({
        tone: "error",
        message: "El evento no tiene tienda asociada para inactivarlo."
      });
      return;
    }

    setIsWorking(true);
    setFeedback(null);

    try {
      const deleted = await storeApi.deleteEventType(accessToken, storeId, eventType.id);
      setEvents((current) => current.map((item) => (item.id === deleted.id ? { ...item, ...deleted } : item)));
      setFeedback({
        tone: "success",
        message: `Evento ${eventType.name} inactivado.`
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No fue posible inactivar el evento."
      });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="events-index-layout">
      <div className="section-header">
        <div>
          <p className="eyebrow">Eventos</p>
          <h3>Listado de eventos</h3>
        </div>
        <button className="primary-button" disabled={isWorking} type="button" onClick={startCreate}>
          <CalendarPlus size={18} aria-hidden="true" />
          <span>Crear evento</span>
        </button>
      </div>

      {feedback ? (
        <div className={`feedback ${feedback.tone}`} role="status">
          {feedback.tone === "error" ? <AlertCircle size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <section className="metric compact" aria-label="Estadistica de eventos">
        <span>Eventos visibles</span>
        <strong>{visibleCount}</strong>
      </section>

      {formState ? (
        <section className="data-panel" aria-label={formState.id ? "Modificar evento" : "Crear evento"}>
          <div className="section-header">
            <h4>{formState.id ? "Modificar evento" : "Crear evento"}</h4>
            <button className="secondary-button" disabled={isWorking} type="button" onClick={() => setFormState(null)}>
              Cancelar
            </button>
          </div>
          <form className="catalog-form event-form" onSubmit={handleSubmit}>
            <label>
              Tienda
              <select
                disabled={!canEditStoreId}
                name="storeId"
                required
                value={formState.storeId}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((current) => (current ? { ...current, storeId: value, logoAssetId: "" } : current));
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
            <label>
              Nombre
              <input
                name="name"
                required
                type="text"
                value={formState.name}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((current) => (current ? { ...current, name: value } : current));
                }}
              />
            </label>
            <label>
              Descripcion
              <input
                name="description"
                type="text"
                value={formState.description}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((current) => (current ? { ...current, description: value } : current));
                }}
              />
            </label>
            <label>
              Logo
              <select
                name="logoAssetId"
                value={formState.logoAssetId}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((current) => (current ? { ...current, logoAssetId: value } : current));
                }}
              >
                <option value="">Sin logo</option>
                {logoAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.originalFilename || asset.storagePath}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-check catalog-check">
              <input
                checked={formState.isActive}
                name="isActive"
                type="checkbox"
                onChange={(event) => {
                  const value = event.currentTarget.checked;
                  setFormState((current) => (current ? { ...current, isActive: value } : current));
                }}
              />
              Activo
            </label>
            <button className="primary-button" disabled={isWorking} type="submit">
              <Save size={18} aria-hidden="true" />
              <span>{isWorking ? "Guardando" : "Guardar evento"}</span>
            </button>
          </form>
        </section>
      ) : null}

      <section className="data-panel" aria-label="Listado de eventos configurados">
        {events.length === 0 ? (
          <p className="empty-state">{isWorking ? "Cargando eventos." : "Sin eventos configurados visibles."}</p>
        ) : (
          <div className="table-list">
            {events.map((eventType) => (
              <article className="event-table-row" key={eventType.id}>
                <div>
                  <strong>{eventType.name}</strong>
                  <span>{eventType.description || "Sin descripcion"}</span>
                </div>
                <div>
                  <span>Tienda</span>
                  <strong>{eventType.store?.name ?? eventType.storeId ?? "Sin tienda"}</strong>
                </div>
                <span className={`status-pill ${eventType.isActive ? "active" : "inactive"}`}>
                  {eventType.isActive ? "Activo" : "Inactivo"}
                </span>
                <div className="row-actions">
                  <button className="secondary-button" disabled={isWorking} type="button" onClick={() => startEdit(eventType)}>
                    <Edit3 size={16} aria-hidden="true" />
                    <span>Modificar</span>
                  </button>
                  {canDelete ? (
                    <button
                      className="danger-button"
                      disabled={isWorking || !eventType.isActive}
                      type="button"
                      onClick={() => void handleSoftDelete(eventType)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      <span>Eliminar</span>
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function emptyToNull(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}
