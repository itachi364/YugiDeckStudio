import { useState } from "react";
import { AlertCircle, Download, ImageDown, ImageUp, ShieldCheck } from "lucide-react";
import { deckApi, type CacheCardImagesResponse, type GenerateDeckImageResponse } from "./deck-api";

type DeckImagePreviewWorkspaceProps = {
  accessToken: string;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

const IMAGE_STORAGE_BASE_URL = import.meta.env.VITE_IMAGE_STORAGE_BASE_URL ?? "http://127.0.0.1:8081";

export function DeckImagePreviewWorkspace({ accessToken }: DeckImagePreviewWorkspaceProps) {
  const [deckId, setDeckId] = useState("");
  const [cacheResult, setCacheResult] = useState<CacheCardImagesResponse | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GenerateDeckImageResponse | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isWorking, setIsWorking] = useState(false);

  const normalizedDeckId = deckId.trim();
  const previewUrl = generatedImage ? buildImageUrl(generatedImage.storagePath) : null;

  const runDeckAction = async (action: () => Promise<void>) => {
    if (!normalizedDeckId) {
      setFeedback({
        tone: "error",
        message: "El Deck ID es obligatorio para generar la imagen."
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

  const handleCacheImages = () =>
    runDeckAction(async () => {
      const result = await deckApi.cacheCardImages(accessToken, normalizedDeckId);
      setCacheResult(result);
      setFeedback({
        tone: result.missing.length > 0 ? "error" : "success",
        message: `Cache de cartas: ${result.cached.length} nuevas, ${result.alreadyCached.length} existentes, ${result.missing.length} faltantes.`
      });
    });

  const handleGenerateImage = () =>
    runDeckAction(async () => {
      const result = await deckApi.generateDeckImage(accessToken, normalizedDeckId);
      setGeneratedImage(result);
      setFeedback({
        tone: "success",
        message: `Imagen generada ${result.width}x${result.height}.`
      });
    });

  return (
    <div className="deck-preview-layout">
      <div className="section-header">
        <div>
          <p className="eyebrow">Imagen final</p>
          <h3>Previsualizar deck</h3>
        </div>
      </div>

      {feedback ? (
        <div className={`feedback ${feedback.tone}`} role="status">
          {feedback.tone === "error" ? <AlertCircle size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <section className="data-panel" aria-label="Seleccion de deck para imagen">
        <div className="review-actions">
          <label>
            Deck ID
            <input
              name="deckId"
              placeholder="uuid del deck revisado"
              required
              type="text"
              value={deckId}
              onChange={(event) => setDeckId(event.currentTarget.value)}
            />
          </label>
          <div className="preview-actions">
            <button className="secondary-button" disabled={isWorking} type="button" onClick={handleCacheImages}>
              <ImageDown size={18} aria-hidden="true" />
              <span>Cachear cartas</span>
            </button>
            <button className="primary-button" disabled={isWorking} type="button" onClick={handleGenerateImage}>
              <ImageUp size={18} aria-hidden="true" />
              <span>{isWorking ? "Procesando" : "Generar imagen"}</span>
            </button>
          </div>
        </div>
      </section>

      {cacheResult ? (
        <section className="data-panel" aria-label="Resultado de cache de cartas">
          <h4>Cache de imagenes</h4>
          <div className="resolution-summary">
            <Metric label="Nuevas" value={cacheResult.cached.length} />
            <Metric label="Existentes" value={cacheResult.alreadyCached.length} />
            <Metric label="Faltantes" value={cacheResult.missing.length} />
          </div>
          {cacheResult.missing.length > 0 ? (
            <div className="table-list" aria-label="Cartas faltantes">
              {cacheResult.missing.map((item, index) => (
                <article className="table-row" key={`${item.cardId ?? "missing"}-${index}`}>
                  <div>
                    <strong>{item.officialName || item.cardId || "Carta sin identificar"}</strong>
                    <span>{item.reason || "No hay imagen cacheada."}</span>
                  </div>
                  <span>Faltante</span>
                  <span>{item.cardId || "Sin card ID"}</span>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="data-panel" aria-label="Previsualizacion de imagen generada">
        <div className="section-header">
          <h4>Previsualizacion</h4>
          {previewUrl ? (
            <a className="secondary-button" download href={previewUrl}>
              <Download size={18} aria-hidden="true" />
              <span>Descargar PNG</span>
            </a>
          ) : null}
        </div>

        {previewUrl && generatedImage ? (
          <div className="deck-image-preview">
            <img alt="Imagen generada del deck" src={previewUrl} />
            <div className="table-list">
              <article className="table-row">
                <div>
                  <strong>{generatedImage.generatedImageId}</strong>
                  <span>{generatedImage.storagePath}</span>
                </div>
                <span>{generatedImage.status}</span>
                <span>{generatedImage.width}x{generatedImage.height}</span>
              </article>
            </div>
          </div>
        ) : (
          <p className="empty-state">Genera una imagen para ver la previsualizacion.</p>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric compact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildImageUrl(storagePath: string): string {
  const cleanPath = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");

  return `${IMAGE_STORAGE_BASE_URL.replace(/\/$/, "")}/${cleanPath}`;
}
