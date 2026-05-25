import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, ImageUp, Palette, Save, Search, ShieldCheck } from "lucide-react";
import { storeApi, StoreAssetCategory, StoreAssetOption, StoreConfiguration, StoreSummary } from "./store-api";

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
      setConfiguration(result);
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
    setFeedback(null);
  };

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

function emptyToNull(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}
