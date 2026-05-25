import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarPlus, Plus, Save, Search, Share2, ShieldCheck, Trophy } from "lucide-react";
import {
  ConfigureStoreCatalogInput,
  StoreAssetOption,
  StoreEventType,
  StoreSocialLink,
  StoreSummary,
  StoreTournamentType,
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

const emptySocialLink: StoreSocialLink = {
  platform: "",
  handle: "",
  url: null,
  iconAssetId: null,
  displayOrder: 1,
  isActive: true
};

export function StoreCatalogsWorkspace({ accessToken, defaultStoreId }: StoreCatalogsWorkspaceProps) {
  const [storeId, setStoreId] = useState(defaultStoreId ?? "");
  const [eventTypes, setEventTypes] = useState<StoreEventType[]>([]);
  const [tournamentTypes, setTournamentTypes] = useState<StoreTournamentType[]>([]);
  const [socialLinks, setSocialLinks] = useState<StoreSocialLink[]>([]);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [eventLogoAssets, setEventLogoAssets] = useState<StoreAssetOption[]>([]);
  const [socialLogoAssets, setSocialLogoAssets] = useState<StoreAssetOption[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isWorking, setIsWorking] = useState(false);

  const normalizedStoreId = storeId.trim();

  const runStoreAction = async (action: () => Promise<void>) => {
    if (!normalizedStoreId) {
      setFeedback({
        tone: "error",
        message: "La tienda es obligatoria para configurar eventos, torneos y redes."
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

  const loadAssetOptions = useCallback(async () => {
    if (!normalizedStoreId) {
      setEventLogoAssets([]);
      setSocialLogoAssets([]);
      return;
    }

    const [eventLogos, socialLogos] = await Promise.all([
      storeApi.listStoreAssets(accessToken, normalizedStoreId, "EVENT_LOGO"),
      storeApi.listStoreAssets(accessToken, normalizedStoreId, "SOCIAL_LOGO")
    ]);
    setEventLogoAssets(eventLogos);
    setSocialLogoAssets(socialLogos);
  }, [accessToken, normalizedStoreId]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  const handleLoadConfiguration = () =>
    runStoreAction(async () => {
      const [events, tournaments, links] = await Promise.all([
        storeApi.listEventTypes(accessToken, normalizedStoreId),
        storeApi.listTournamentTypes(accessToken, normalizedStoreId),
        storeApi.listSocialLinks(accessToken, normalizedStoreId),
        loadAssetOptions()
      ]);

      setEventTypes(events);
      setTournamentTypes(tournaments);
      setSocialLinks(links.length > 0 ? links : [{ ...emptySocialLink }]);
      setFeedback({
        tone: "success",
        message: "Catalogos de tienda cargados."
      });
    });

  const handleCreateEventType = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = readCatalogForm(form);

    runStoreAction(async () => {
      const result = await storeApi.createEventType(accessToken, normalizedStoreId, input);
      setEventTypes((current) => [...current, result]);
      form.reset();
      setFeedback({
        tone: "success",
        message: `Tipo de evento ${result.name} creado.`
      });
    });
  };

  const handleCreateTournamentType = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = readCatalogForm(form);

    runStoreAction(async () => {
      const result = await storeApi.createTournamentType(accessToken, normalizedStoreId, input);
      setTournamentTypes((current) => [...current, result]);
      form.reset();
      setFeedback({
        tone: "success",
        message: `Tipo de torneo ${result.name} creado.`
      });
    });
  };

  const handleReplaceSocialLinks = () =>
    runStoreAction(async () => {
      const normalizedLinks = socialLinks
        .filter((link) => link.platform.trim() && link.handle.trim())
        .map((link, index) => ({
          platform: link.platform.trim(),
          handle: link.handle.trim(),
          url: emptyToNull(link.url ?? ""),
          iconAssetId: emptyToNull(link.iconAssetId ?? ""),
          displayOrder: Math.max(1, Number(link.displayOrder) || index + 1),
          isActive: Boolean(link.isActive)
        }));

      const result = await storeApi.replaceSocialLinks(accessToken, normalizedStoreId, normalizedLinks);
      setSocialLinks(result.length > 0 ? result : [{ ...emptySocialLink }]);
      setFeedback({
        tone: "success",
        message: `${result.length} redes sociales guardadas.`
      });
    });

  const updateSocialLink = (index: number, field: keyof StoreSocialLink, value: string | boolean) => {
    setSocialLinks((current) =>
      current.map((link, linkIndex) => {
        if (linkIndex !== index) {
          return link;
        }

        if (field === "displayOrder") {
          return {
            ...link,
            displayOrder: Number(value)
          };
        }

        return {
          ...link,
          [field]: value
        };
      })
    );
  };

  return (
    <div className="store-catalogs-layout">
      <div className="section-header">
        <div>
          <p className="eyebrow">Catalogos</p>
          <h3>Eventos, torneos y redes</h3>
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
                setTournamentTypes([]);
                setSocialLinks([]);
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
        <section className="data-panel" aria-label="Tipos de eventos">
          <div className="section-header">
            <h4>Tipos de eventos</h4>
            <CalendarPlus size={20} aria-hidden="true" />
          </div>
          <CatalogList items={eventTypes} emptyText="Sin tipos de eventos." />
          <CatalogForm
            buttonLabel="Crear evento"
            logoAssets={eventLogoAssets}
            isWorking={isWorking}
            labelPrefix="Evento"
            onSubmit={handleCreateEventType}
          />
        </section>

        <section className="data-panel" aria-label="Tipos de torneos">
          <div className="section-header">
            <h4>Tipos de torneos</h4>
            <Trophy size={20} aria-hidden="true" />
          </div>
          <CatalogList items={tournamentTypes} emptyText="Sin tipos de torneos." />
          <CatalogForm
            buttonLabel="Crear torneo"
            logoAssets={eventLogoAssets}
            isWorking={isWorking}
            labelPrefix="Torneo"
            onSubmit={handleCreateTournamentType}
          />
        </section>
      </div>

      <section className="data-panel" aria-label="Redes sociales">
        <div className="section-header">
          <h4>Redes sociales</h4>
          <Share2 size={20} aria-hidden="true" />
        </div>
        <div className="social-link-list">
          {socialLinks.map((link, index) => (
            <article className="social-link-row" key={`${link.id ?? "new"}-${index}`}>
              <label>
                Plataforma
                <input
                  required
                  type="text"
                  value={link.platform}
                  onChange={(event) => updateSocialLink(index, "platform", event.currentTarget.value)}
                />
              </label>
              <label>
                Handle
                <input
                  required
                  type="text"
                  value={link.handle}
                  onChange={(event) => updateSocialLink(index, "handle", event.currentTarget.value)}
                />
              </label>
              <label>
                URL
                <input
                  type="url"
                  value={link.url ?? ""}
                  onChange={(event) => updateSocialLink(index, "url", event.currentTarget.value)}
                />
              </label>
              <label>
                Icono
                <select
                  value={link.iconAssetId ?? ""}
                  onChange={(event) => updateSocialLink(index, "iconAssetId", event.currentTarget.value)}
                >
                  <option value="">Sin icono</option>
                  {socialLogoAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.originalFilename || asset.storagePath}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Orden
                <input
                  min={1}
                  type="number"
                  value={link.displayOrder ?? index + 1}
                  onChange={(event) => updateSocialLink(index, "displayOrder", event.currentTarget.value)}
                />
              </label>
              <label className="inline-check catalog-check">
                <input
                  checked={link.isActive ?? true}
                  type="checkbox"
                  onChange={(event) => updateSocialLink(index, "isActive", event.currentTarget.checked)}
                />
                Activa
              </label>
            </article>
          ))}
        </div>
        <div className="review-footer-actions">
          <button
            className="secondary-button"
            disabled={isWorking}
            type="button"
            onClick={() => setSocialLinks((current) => [...current, { ...emptySocialLink, displayOrder: current.length + 1 }])}
          >
            <Plus size={18} aria-hidden="true" />
            <span>Agregar red</span>
          </button>
          <button className="primary-button" disabled={isWorking} type="button" onClick={handleReplaceSocialLinks}>
            <Save size={18} aria-hidden="true" />
            <span>Guardar redes</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function CatalogForm({
  buttonLabel,
  logoAssets,
  isWorking,
  labelPrefix,
  onSubmit
}: {
  buttonLabel: string;
  logoAssets: StoreAssetOption[];
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
        <select name="logoAssetId">
          <option value="">Sin logo</option>
          {logoAssets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.originalFilename || asset.storagePath}
            </option>
          ))}
        </select>
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

function CatalogList({ emptyText, items }: { emptyText: string; items: StoreEventType[] }) {
  if (items.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <div className="table-list">
      {items.map((item) => (
        <article className="table-row" key={item.id}>
          <div>
            <strong>{item.name}</strong>
            <span>{item.description || "Sin descripcion"}</span>
          </div>
          <span>{item.logoAssetId || "Sin logo"}</span>
          <span>{item.isActive ? "Activo" : "Inactivo"}</span>
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
    logoAssetId: emptyToNull(String(formData.get("logoAssetId") ?? "")),
    isActive: formData.get("isActive") === "on"
  };
}

function emptyToNull(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}
