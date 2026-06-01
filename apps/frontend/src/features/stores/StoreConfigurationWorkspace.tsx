import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { AlertCircle, ImageUp, Palette, Plus, Save, Search, Share2, ShieldCheck, Trash2, X } from "lucide-react";
import { storeApi, StoreAssetCategory, StoreAssetOption, StoreConfiguration, StoreSocialLink, StoreSummary } from "./store-api";

type StoreConfigurationWorkspaceProps = {
  accessToken: string;
  defaultStoreId?: string | null;
  isRoot: boolean;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

type AssetUploadTarget = "primaryLogoAssetId" | "secondaryLogoAssetId" | "backgroundImageAssetId";

type SocialLinkDraft = StoreSocialLink & {
  logoFile?: File | null;
};

const uploadTargets: Array<{
  field: AssetUploadTarget;
  category: StoreAssetCategory;
  label: string;
}> = [
  {
    field: "primaryLogoAssetId",
    category: "STORE_LOGO",
    label: "Logo primario"
  },
  {
    field: "secondaryLogoAssetId",
    category: "STORE_LOGO",
    label: "Logo secundario"
  },
  {
    field: "backgroundImageAssetId",
    category: "BACKGROUND_IMAGE",
    label: "Fondo propio"
  }
];

const emptySocialLink: SocialLinkDraft = {
  platform: "",
  handle: "",
  url: null,
  iconAssetId: null,
  displayOrder: 1,
  isActive: true,
  logoFile: null
};

export function StoreConfigurationWorkspace({
  accessToken,
  defaultStoreId,
  isRoot
}: StoreConfigurationWorkspaceProps) {
  const [storeId, setStoreId] = useState(defaultStoreId ?? "");
  const [configuration, setConfiguration] = useState<StoreConfiguration | null>(null);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [storeLogoAssets, setStoreLogoAssets] = useState<StoreAssetOption[]>([]);
  const [backgroundAssets, setBackgroundAssets] = useState<StoreAssetOption[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinkDraft[]>([]);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isWorking, setIsWorking] = useState(false);

  const normalizedStoreId = storeId.trim();
  const isCreateMode = !normalizedStoreId;

  const runAction = async (action: () => Promise<void>) => {
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

  const runStoreAction = async (action: () => Promise<void>) => {
    if (!normalizedStoreId) {
      setFeedback({
        tone: "error",
        message: "La tienda es obligatoria para configurar la tienda."
      });
      return;
    }

    await runAction(action);
  };

  const loadStores = useCallback(async () => {
    try {
      const result = await storeApi.listStores(accessToken);
      setStores(result);
      setStoreId((current) => current || (result.length === 1 ? result[0].id : current));
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No fue posible cargar las tiendas."
      });
    }
  }, [accessToken]);

  const loadAssetOptions = useCallback(async () => {
    if (!normalizedStoreId) {
      setStoreLogoAssets([]);
      setBackgroundAssets([]);
      return;
    }

    const [logos, backgrounds] = await Promise.all([
      storeApi.listStoreAssets(accessToken, normalizedStoreId, "STORE_LOGO"),
      storeApi.listStoreAssets(accessToken, normalizedStoreId, "BACKGROUND_IMAGE")
    ]);
    setStoreLogoAssets(logos);
    setBackgroundAssets(backgrounds);
  }, [accessToken, normalizedStoreId]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  const handleLoadConfiguration = () =>
    runStoreAction(async () => {
      const [result] = await Promise.all([
        storeApi.getStoreConfiguration(accessToken, normalizedStoreId),
        loadAssetOptions()
      ]);
      const links = Array.isArray(result.socialLinks) ? (result.socialLinks as StoreSocialLink[]) : [];
      setConfiguration(result);
      setSocialLinks(links.map((link) => ({ ...link, logoFile: null })));
      setFeedback({
        tone: "success",
        message: `Configuracion cargada para ${result.name}.`
      });
    });

  const handleUpdateConfiguration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const baseInput = {
      name: String(formData.get("name") ?? ""),
      sourceCreditText: emptyToNull(String(formData.get("sourceCreditText") ?? "")),
      backgroundColor: emptyToNull(String(formData.get("backgroundColor") ?? ""))
    };

    if (!normalizedStoreId) {
      void runAction(async () => {
        if (!isRoot) {
          throw new Error("Solo root puede crear tiendas.");
        }

        const created = await storeApi.createStore(accessToken, baseInput);
        setConfiguration(created);
        setStoreId(created.id);
        setSocialLinks([]);
        setStores((current) =>
          [...current, { id: created.id, name: created.name }].sort((left, right) => left.name.localeCompare(right.name))
        );
        setFeedback({
          tone: "success",
          message: `Tienda ${created.name} creada.`
        });
      });
      return;
    }

    runStoreAction(async () => {
      const result = await storeApi.updateStoreConfiguration(accessToken, normalizedStoreId, {
        ...baseInput,
        primaryLogoAssetId: emptyToNull(String(formData.get("primaryLogoAssetId") ?? "")),
        secondaryLogoAssetId: emptyToNull(String(formData.get("secondaryLogoAssetId") ?? "")),
        backgroundImageAssetId: emptyToNull(String(formData.get("backgroundImageAssetId") ?? ""))
      });

      setConfiguration(result);
      setFeedback({
        tone: "success",
        message: "Configuracion de tienda actualizada."
      });
    });
  };

  const handleUploadAsset = (field: AssetUploadTarget, category: StoreAssetCategory, file?: File | null) =>
    runStoreAction(async () => {
      if (!file || file.size === 0) {
        setFeedback({
          tone: "error",
          message: "Selecciona una imagen antes de subir el asset."
        });
        return;
      }

      const upload = await storeApi.uploadStoreAsset(accessToken, normalizedStoreId, category, file);
      await loadAssetOptions();
      setConfiguration((current) => ({
        ...(current ?? {
          id: normalizedStoreId,
          name: "",
          backgroundColor: "#10131a",
          sourceCreditText: ""
        }),
        [field]: upload.imageAssetId
      }));
      setFeedback({
        tone: "success",
        message: `${upload.category} cargado como asset permanente.`
      });
    });

  const startCreateStore = () => {
    setStoreId("");
    setConfiguration(null);
    setStoreLogoAssets([]);
    setBackgroundAssets([]);
    setSocialLinks([]);
    setIsSocialModalOpen(false);
    setFeedback(null);
  };

  const handleReplaceSocialLinks = async (drafts: SocialLinkDraft[]) =>
    runStoreAction(async () => {
      const normalizedLinks = await Promise.all(
        drafts
          .filter((link) => link.platform.trim() && link.handle.trim())
          .map(async (link, index) => {
            const iconAssetId = link.logoFile
              ? (await storeApi.uploadStoreAsset(accessToken, normalizedStoreId, "SOCIAL_LOGO", link.logoFile)).imageAssetId
              : emptyToNull(link.iconAssetId ?? "");

            return {
              platform: link.platform.trim(),
              handle: link.handle.trim(),
              url: emptyToNull(link.url ?? ""),
              iconAssetId,
              displayOrder: Math.max(1, Number(link.displayOrder) || index + 1),
              isActive: Boolean(link.isActive)
            };
          })
      );

      const result = await storeApi.replaceSocialLinks(accessToken, normalizedStoreId, normalizedLinks);
      setSocialLinks(result.map((link) => ({ ...link, logoFile: null })));
      setIsSocialModalOpen(false);
      setFeedback({
        tone: "success",
        message: `${result.length} redes sociales guardadas.`
      });
    });

  return (
    <div className="store-configuration-layout">
      <div className="section-header">
        <div>
          <p className="eyebrow">Branding</p>
          <h3>Configuracion de tienda</h3>
        </div>
      </div>

      {feedback ? (
        <div className={`feedback ${feedback.tone}`} role="status">
          {feedback.tone === "error" ? <AlertCircle size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {stores.length > 0 ? (
        <section className="data-panel" aria-label="Seleccion de tienda">
          <div className="review-actions">
            <label>
              Tienda
              <select
                name="storeId"
                required
                value={storeId}
                onChange={(event) => {
                  setStoreId(event.currentTarget.value);
                  setConfiguration(null);
                }}
              >
                <option value="">Crear tienda nueva</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary-button" disabled={isWorking || isCreateMode} type="button" onClick={handleLoadConfiguration}>
              <Search size={18} aria-hidden="true" />
              <span>{isWorking ? "Consultando" : "Consultar"}</span>
            </button>
            {isRoot ? (
              <button className="secondary-button" disabled={isWorking || isCreateMode} type="button" onClick={startCreateStore}>
                Nueva tienda
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="data-panel" aria-label="Creacion de primera tienda">
          <p className="empty-state">
            {isRoot
              ? "No hay tiendas creadas. Completa el formulario y guarda para crear la primera tienda."
              : "No tienes una tienda vinculada para configurar."}
          </p>
        </section>
      )}

      <form className="auth-form two-column" aria-label="Configuracion base de tienda" onSubmit={handleUpdateConfiguration}>
        <label>
          Nombre de tienda
          <input defaultValue={configuration?.name ?? ""} key={`name-${configuration?.id ?? "empty"}`} name="name" required type="text" />
        </label>
        <label>
          Color de fondo
          <input
            defaultValue={configuration?.backgroundColor ?? "#10131a"}
            key={`color-${configuration?.id ?? "empty"}`}
            name="backgroundColor"
            pattern="#[0-9a-fA-F]{6}"
            required
            type="text"
          />
        </label>
        <label>
          Credito inferior
          <input
            defaultValue={configuration?.sourceCreditText ?? ""}
            key={`source-${configuration?.id ?? "empty"}`}
            name="sourceCreditText"
            type="text"
          />
        </label>
        <label>
          Logo primario
          <select
            disabled={isCreateMode}
            key={`primary-${configuration?.primaryLogoAssetId ?? "empty"}`}
            name="primaryLogoAssetId"
            defaultValue={configuration?.primaryLogoAssetId ?? ""}
          >
            <option value="">Sin logo</option>
            {storeLogoAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.originalFilename || asset.storagePath}
              </option>
            ))}
          </select>
        </label>
        <label>
          Logo secundario
          <select
            disabled={isCreateMode}
            key={`secondary-${configuration?.secondaryLogoAssetId ?? "empty"}`}
            name="secondaryLogoAssetId"
            defaultValue={configuration?.secondaryLogoAssetId ?? ""}
          >
            <option value="">Sin logo</option>
            {storeLogoAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.originalFilename || asset.storagePath}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fondo
          <select
            disabled={isCreateMode}
            key={`background-${configuration?.backgroundImageAssetId ?? "empty"}`}
            name="backgroundImageAssetId"
            defaultValue={configuration?.backgroundImageAssetId ?? ""}
          >
            <option value="">Sin fondo</option>
            {backgroundAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.originalFilename || asset.storagePath}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button full-width" disabled={isWorking} type="submit">
          <Save size={18} aria-hidden="true" />
          <span>{isWorking ? "Guardando" : isCreateMode ? "Crear tienda" : "Guardar configuracion"}</span>
        </button>
      </form>

      <section className="data-panel" aria-label="Assets configurables">
        <div className="section-header">
          <h4>Logos y fondo</h4>
          <Palette size={20} aria-hidden="true" />
        </div>
        <div className="asset-upload-grid">
          {uploadTargets.map((target) => (
            <AssetUploadCard
              isWorking={isWorking || isCreateMode}
              key={target.field}
              label={target.label}
              value={configuration?.[target.field] ?? null}
              onUpload={(file) => handleUploadAsset(target.field, target.category, file)}
            />
          ))}
        </div>
      </section>

      <section className="data-panel" aria-label="Redes sociales de tienda">
        <div className="section-header">
          <div>
            <h4>Redes sociales</h4>
            <p className="empty-state">{socialLinks.length > 0 ? `${socialLinks.length} redes configuradas.` : "Sin redes configuradas."}</p>
          </div>
          <Share2 size={20} aria-hidden="true" />
        </div>
        <div className="table-list">
          {socialLinks.map((link, index) => (
            <article className="table-row" key={`${link.id ?? link.platform}-${index}`}>
              <div>
                <strong>{link.platform}</strong>
                <span>{link.handle}</span>
              </div>
              <span>{link.url || "Sin URL"}</span>
              <span>{link.iconAssetId || "Sin logo"}</span>
            </article>
          ))}
        </div>
        <div className="review-footer-actions">
          <button className="secondary-button" disabled={isWorking || isCreateMode} type="button" onClick={() => setIsSocialModalOpen(true)}>
            <Plus size={18} aria-hidden="true" />
            <span>Crear redes sociales</span>
          </button>
        </div>
      </section>

      {isSocialModalOpen ? (
        <ResponsiveModal title="Crear redes sociales" onClose={() => setIsSocialModalOpen(false)}>
          <SocialLinksForm
            initialLinks={socialLinks}
            isWorking={isWorking}
            onSubmit={handleReplaceSocialLinks}
          />
        </ResponsiveModal>
      ) : null}
    </div>
  );
}

function AssetUploadCard({
  isWorking,
  label,
  value,
  onUpload
}: {
  isWorking: boolean;
  label: string;
  value?: string | null;
  onUpload: (file?: File | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <article className="asset-upload-card">
      <div>
        <strong>{label}</strong>
        <span>{value || "Sin asset asociado"}</span>
      </div>
      <label>
        Imagen
        <input
          accept="image/jpeg,image/png,image/webp"
          type="file"
          onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
        />
      </label>
      <button className="secondary-button" disabled={isWorking} type="button" onClick={() => onUpload(file)}>
        <ImageUp size={18} aria-hidden="true" />
        <span>Subir</span>
      </button>
    </article>
  );
}

function SocialLinksForm({
  initialLinks,
  isWorking,
  onSubmit
}: {
  initialLinks: SocialLinkDraft[];
  isWorking: boolean;
  onSubmit: (links: SocialLinkDraft[]) => Promise<void>;
}) {
  const [links, setLinks] = useState<SocialLinkDraft[]>(
    initialLinks.length > 0 ? initialLinks.map((link) => ({ ...link, logoFile: null })) : [{ ...emptySocialLink }]
  );

  const updateLink = (index: number, field: keyof SocialLinkDraft, value: string | boolean | File | null) => {
    setLinks((current) =>
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

  const removeLink = (index: number) => {
    setLinks((current) => current.filter((_, linkIndex) => linkIndex !== index));
  };

  return (
    <form
      className="catalog-form"
      aria-label="Formulario de redes sociales"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(links);
      }}
    >
      <div className="social-link-list">
        {links.map((link, index) => (
          <article className="social-link-row social-link-modal-row" key={`${link.id ?? "new"}-${index}`}>
            <label>
              Plataforma
              <input
                required
                type="text"
                value={link.platform}
                onChange={(event) => updateLink(index, "platform", event.currentTarget.value)}
              />
            </label>
            <label>
              Handle
              <input
                required
                type="text"
                value={link.handle}
                onChange={(event) => updateLink(index, "handle", event.currentTarget.value)}
              />
            </label>
            <label>
              URL
              <input type="url" value={link.url ?? ""} onChange={(event) => updateLink(index, "url", event.currentTarget.value)} />
            </label>
            <label>
              Logo
              <input
                accept="image/jpeg,image/png,image/webp"
                type="file"
                onChange={(event) => updateLink(index, "logoFile", event.currentTarget.files?.[0] ?? null)}
              />
            </label>
            <label>
              Orden
              <input
                min={1}
                type="number"
                value={link.displayOrder ?? index + 1}
                onChange={(event) => updateLink(index, "displayOrder", event.currentTarget.value)}
              />
            </label>
            <label className="inline-check catalog-check">
              <input
                checked={link.isActive ?? true}
                type="checkbox"
                onChange={(event) => updateLink(index, "isActive", event.currentTarget.checked)}
              />
              Activa
            </label>
            <button
              aria-label="Eliminar red social"
              className="danger-button"
              disabled={links.length === 1}
              type="button"
              onClick={() => removeLink(index)}
            >
              <Trash2 size={18} aria-hidden="true" />
              <span>Eliminar</span>
            </button>
          </article>
        ))}
      </div>
      <div className="review-footer-actions">
        <button
          className="secondary-button"
          disabled={isWorking}
          type="button"
          onClick={() => setLinks((current) => [...current, { ...emptySocialLink, displayOrder: current.length + 1 }])}
        >
          <Plus size={18} aria-hidden="true" />
          <span>Agregar red</span>
        </button>
        <button className="primary-button" disabled={isWorking} type="submit">
          <Save size={18} aria-hidden="true" />
          <span>Guardar redes</span>
        </button>
      </div>
    </form>
  );
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

function emptyToNull(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}
