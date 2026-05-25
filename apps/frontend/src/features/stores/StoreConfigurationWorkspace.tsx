import { FormEvent, useState } from "react";
import { AlertCircle, ImageUp, Palette, Save, Search, ShieldCheck } from "lucide-react";
import { storeApi, StoreAssetCategory, StoreConfiguration } from "./store-api";

type StoreConfigurationWorkspaceProps = {
  accessToken: string;
  defaultStoreId?: string | null;
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
  defaultStoreId
}: StoreConfigurationWorkspaceProps) {
  const [storeId, setStoreId] = useState(defaultStoreId ?? "");
  const [configuration, setConfiguration] = useState<StoreConfiguration | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isWorking, setIsWorking] = useState(false);

  const normalizedStoreId = storeId.trim();

  const runStoreAction = async (action: () => Promise<void>) => {
    if (!normalizedStoreId) {
      setFeedback({
        tone: "error",
        message: "El Store ID es obligatorio para configurar la tienda."
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

  const handleLoadConfiguration = () =>
    runStoreAction(async () => {
      const result = await storeApi.getStoreConfiguration(accessToken, normalizedStoreId);
      setConfiguration(result);
      setFeedback({
        tone: "success",
        message: `Configuracion cargada para ${result.name}.`
      });
    });

  const handleUpdateConfiguration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    runStoreAction(async () => {
      const result = await storeApi.updateStoreConfiguration(accessToken, normalizedStoreId, {
        name: String(formData.get("name") ?? ""),
        sourceCreditText: emptyToNull(String(formData.get("sourceCreditText") ?? "")),
        backgroundColor: emptyToNull(String(formData.get("backgroundColor") ?? "")),
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

      <section className="data-panel" aria-label="Seleccion de tienda">
        <div className="review-actions">
          <label>
            Store ID
            <input
              name="storeId"
              placeholder="uuid de la tienda"
              required
              type="text"
              value={storeId}
              onChange={(event) => setStoreId(event.currentTarget.value)}
            />
          </label>
          <button className="secondary-button" disabled={isWorking} type="button" onClick={handleLoadConfiguration}>
            <Search size={18} aria-hidden="true" />
            <span>{isWorking ? "Consultando" : "Consultar"}</span>
          </button>
        </div>
      </section>

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
          Texto fuente
          <input
            defaultValue={configuration?.sourceCreditText ?? ""}
            key={`source-${configuration?.id ?? "empty"}`}
            name="sourceCreditText"
            type="text"
          />
        </label>
        <label>
          Logo primario asset ID
          <input
            defaultValue={configuration?.primaryLogoAssetId ?? ""}
            key={`primary-${configuration?.primaryLogoAssetId ?? "empty"}`}
            name="primaryLogoAssetId"
            type="text"
          />
        </label>
        <label>
          Logo secundario asset ID
          <input
            defaultValue={configuration?.secondaryLogoAssetId ?? ""}
            key={`secondary-${configuration?.secondaryLogoAssetId ?? "empty"}`}
            name="secondaryLogoAssetId"
            type="text"
          />
        </label>
        <label>
          Fondo asset ID
          <input
            defaultValue={configuration?.backgroundImageAssetId ?? ""}
            key={`background-${configuration?.backgroundImageAssetId ?? "empty"}`}
            name="backgroundImageAssetId"
            type="text"
          />
        </label>
        <button className="primary-button full-width" disabled={isWorking} type="submit">
          <Save size={18} aria-hidden="true" />
          <span>{isWorking ? "Guardando" : "Guardar configuracion"}</span>
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
              isWorking={isWorking}
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
