import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Download, ImageDown, ImageUp, ListChecks, RefreshCw, ShieldCheck, X } from "lucide-react";
import { DeckReviewWorkspace } from "./DeckReviewWorkspace";
import { CacheCardImagesResponse, deckApi, DeckSummary, GenerateDeckImageResponse, UploadDeckResponse } from "./deck-api";
import { StoreSummary, StoreTournament, storeApi } from "../stores/store-api";

type DeckUploadWorkspaceProps = {
  accessToken: string;
  defaultStoreId?: string | null;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

type GenerationResult = {
  deckId: string;
  cacheResult: CacheCardImagesResponse;
  generatedImage: GenerateDeckImageResponse | null;
};

const IMAGE_STORAGE_BASE_URL = import.meta.env.VITE_IMAGE_STORAGE_BASE_URL ?? "/images";
const RESULT_OPTIONS = ["Ganador", "Segundo Puesto", "Top 3 - 4", "Top 8"];

export function DeckUploadWorkspace({ accessToken, defaultStoreId }: DeckUploadWorkspaceProps) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastUpload, setLastUpload] = useState<UploadDeckResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [storeId, setStoreId] = useState(defaultStoreId ?? "");
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [tournaments, setTournaments] = useState<StoreTournament[]>([]);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [reviewDeckId, setReviewDeckId] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [generatingDeckId, setGeneratingDeckId] = useState<string | null>(null);
  const [generationDeck, setGenerationDeck] = useState<DeckSummary | null>(null);
  const isMobileLayout = useIsMobileLayout();

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

  const loadDecks = useCallback(async () => {
    try {
      const result = await deckApi.listDecks(accessToken);
      setDecks(result);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No fue posible cargar los decks."
      });
    }
  }, [accessToken]);

  useEffect(() => {
    void loadDecks();
  }, [loadDecks]);

  useEffect(() => {
    if (!storeId) {
      setTournaments([]);
      return;
    }

    storeApi
      .listTournaments(accessToken, storeId, "OPEN")
      .then(setTournaments)
      .catch((error: unknown) => {
        setFeedback({
          tone: "error",
          message: error instanceof Error ? error.message : "No fue posible cargar torneos abiertos."
        });
      });
  }, [accessToken, storeId]);

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedFile || selectedFile.size === 0) {
      setFeedback({
        tone: "error",
        message: "La imagen del deck list es obligatoria."
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    setLastUpload(null);

    try {
      const result = await deckApi.uploadDeckList(accessToken, {
        storeId: String(formData.get("storeId") ?? ""),
        playerName: String(formData.get("playerName") ?? ""),
        tournamentId: String(formData.get("tournamentId") ?? ""),
        resultLabel: String(formData.get("resultLabel") ?? ""),
        deckName: String(formData.get("deckName") ?? ""),
        neuronDeckUrl: String(formData.get("neuronDeckUrl") ?? ""),
        deckListImage: selectedFile
      });

      setLastUpload(result);
      await loadDecks();
      setFeedback({
        tone: "success",
        message: `Deck cargado con ${result.importedCardCount} cartas importadas desde Neuron.`
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No fue posible cargar el deck."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDeckState = useCallback((deckId: string, status: string, reviewStatus: string) => {
    setDecks((currentDecks) =>
      currentDecks.map((deck) =>
        deck.deckId === deckId
          ? {
              ...deck,
              status,
              reviewStatus
            }
          : deck
      )
    );
    setLastUpload((currentUpload) =>
      currentUpload?.deckId === deckId
        ? {
            ...currentUpload,
            status,
            reviewStatus
          }
        : currentUpload
    );
  }, []);

  const handleGenerateDeckImage = async (deck: DeckSummary) => {
    setGenerationDeck(deck);
    setGenerationResult(null);

    if (deck.reviewStatus !== "CONFIRMED") {
      setFeedback({
        tone: "error",
        message: "Confirma la revision del deck antes de generar la imagen."
      });
      return;
    }

    setGeneratingDeckId(deck.deckId);
    setFeedback(null);

    try {
      const cacheResult = await deckApi.cacheCardImages(accessToken, deck.deckId);

      if (cacheResult.missing.length > 0) {
        setGenerationResult({
          deckId: deck.deckId,
          cacheResult,
          generatedImage: null
        });
        setFeedback({
          tone: "error",
          message: `No se genero la imagen: ${cacheResult.missing.length} cartas siguen faltantes.`
        });
        return;
      }

      const generatedImage = await deckApi.generateDeckImage(accessToken, deck.deckId);
      setGenerationResult({
        deckId: deck.deckId,
        cacheResult,
        generatedImage
      });
      updateDeckState(deck.deckId, generatedImage.status, deck.reviewStatus);
      await loadDecks();
      setFeedback({
        tone: "success",
        message: `Imagen generada ${generatedImage.width}x${generatedImage.height}.`
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No fue posible generar la imagen."
      });
    } finally {
      setGeneratingDeckId(null);
    }
  };

  if (reviewDeckId) {
    const reviewWorkspace = (
      <DeckReviewWorkspace
        accessToken={accessToken}
        deckId={reviewDeckId}
        onBack={() => {
          setReviewDeckId(null);
          void loadDecks();
        }}
        onDeckChanged={(deckId, status, reviewStatus) => {
          updateDeckState(deckId, status, reviewStatus);
          void loadDecks();
        }}
      />
    );

    if (isMobileLayout) {
      return reviewWorkspace;
    }
  }

  if (generationDeck && isMobileLayout) {
    return (
      <DeckGenerationView
        deck={generationDeck}
        isWorking={generatingDeckId === generationDeck.deckId}
        result={generationResult}
        onBack={() => {
          setGenerationDeck(null);
          setGenerationResult(null);
          setGeneratingDeckId(null);
        }}
      />
    );
  }

  return (
    <div className="deck-upload-layout">
      <div className="section-header">
        <div>
          <p className="eyebrow">Decks</p>
          <h3>Cargar deck list</h3>
        </div>
      </div>

      {feedback ? (
        <div className={`feedback ${feedback.tone}`} role="status">
          {feedback.tone === "error" ? <AlertCircle size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <form className="auth-form two-column" aria-label="Cargar deck list" onSubmit={handleUpload}>
        <label>
          Tienda
          <select
            name="storeId"
            required
            value={storeId}
            onChange={(event) => setStoreId(event.currentTarget.value)}
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
          Jugador
          <input name="playerName" required type="text" />
        </label>
        <label>
          Resultado
          <select name="resultLabel" required>
            <option value="">Selecciona resultado</option>
            {RESULT_OPTIONS.map((resultOption) => (
              <option key={resultOption} value={resultOption}>
                {resultOption}
              </option>
            ))}
          </select>
        </label>
        <label>
          Torneo
          <select name="tournamentId" required>
            <option value="">Selecciona un torneo abierto</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Deck usado
          <input name="deckName" required type="text" />
        </label>
        <label>
          Link Neuron
          <input
            name="neuronDeckUrl"
            placeholder="https://neuron.konami.net/link/..."
            required
            type="url"
          />
        </label>
        <label>
          Imagen deck list
          <input
            accept="image/jpeg,image/png,image/webp"
            name="deckListImage"
            type="file"
            onChange={(event) => setSelectedFile(event.currentTarget.files?.[0] ?? null)}
          />
        </label>
        <button className="primary-button full-width" disabled={isSubmitting} type="submit">
          <ImageUp size={18} aria-hidden="true" />
          <span>{isSubmitting ? "Cargando" : "Cargar deck"}</span>
        </button>
      </form>

      {lastUpload ? (
        <section className="data-panel" aria-label="Resultado de carga">
          <h4>Deck cargado</h4>
          <div className="table-list">
            <article className="table-row">
              <div>
                <strong>{lastUpload.deckId}</strong>
                <span>Deck ID</span>
              </div>
              <span>{lastUpload.extractionStatus}</span>
              <span>{lastUpload.reviewStatus}</span>
              <span>{lastUpload.importedCardCount} cartas</span>
              <button className="secondary-button" type="button" onClick={() => setReviewDeckId(lastUpload.deckId)}>
                <ListChecks size={18} aria-hidden="true" />
                <span>Revisar deck</span>
              </button>
            </article>
          </div>
        </section>
      ) : null}

      <section className="data-panel" aria-label="Decks cargados">
        <div className="section-header">
          <h4>Decks cargados</h4>
          <button className="secondary-button" type="button" onClick={() => void loadDecks()}>
            <RefreshCw size={18} aria-hidden="true" />
            <span>Actualizar</span>
          </button>
        </div>

        {decks.length > 0 ? (
          <div className="table-list">
            {decks.map((deck) => (
              <article className="table-row deck-list-row" key={deck.deckId}>
                <div>
                  <strong>{deck.deckName}</strong>
                  <span>
                    {deck.playerName}
                    {deck.tournamentName ? ` - ${deck.tournamentName}` : ""}
                  </span>
                </div>
                <span>{deck.storeName}</span>
                <span>{formatDate(deck.tournamentDate)}</span>
                <span>{deck.resultLabel}</span>
                <span>{deck.status}</span>
                <span>{deck.reviewStatus}</span>
                <span>{deck.cardCount} cartas</span>
                <div className="row-actions">
                  <button
                    className="secondary-button"
                    disabled={deck.reviewStatus === "CONFIRMED"}
                    type="button"
                    onClick={() => setReviewDeckId(deck.deckId)}
                  >
                    <ListChecks size={18} aria-hidden="true" />
                    <span>Revisar</span>
                  </button>
                  <button
                    className="primary-button"
                    disabled={generatingDeckId === deck.deckId || deck.reviewStatus !== "CONFIRMED"}
                    type="button"
                    onClick={() => void handleGenerateDeckImage(deck)}
                  >
                    <ImageDown size={18} aria-hidden="true" />
                    <span>{generatingDeckId === deck.deckId ? "Generando" : "Generar imagen"}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No hay decks cargados visibles para tu usuario.</p>
        )}
      </section>

      {reviewDeckId && !isMobileLayout ? (
        <ResponsiveModal title="Revisar deck" onClose={() => setReviewDeckId(null)}>
          <DeckReviewWorkspace
            accessToken={accessToken}
            deckId={reviewDeckId}
            onBack={() => {
              setReviewDeckId(null);
              void loadDecks();
            }}
            onDeckChanged={(deckId, status, reviewStatus) => {
              updateDeckState(deckId, status, reviewStatus);
              void loadDecks();
            }}
          />
        </ResponsiveModal>
      ) : null}

      {generationDeck && !isMobileLayout ? (
        <ResponsiveModal
          title="Imagen del deck"
          onClose={() => {
            setGenerationDeck(null);
            setGenerationResult(null);
            setGeneratingDeckId(null);
          }}
        >
          <DeckGenerationView
            deck={generationDeck}
            isWorking={generatingDeckId === generationDeck.deckId}
            result={generationResult}
          />
        </ResponsiveModal>
      ) : null}
    </div>
  );
}

function DeckGenerationView({
  deck,
  isWorking,
  result,
  onBack
}: {
  deck: DeckSummary;
  isWorking: boolean;
  result: GenerationResult | null;
  onBack?: () => void;
}) {
  return (
    <div className="deck-generation-layout">
      <div className="section-header">
        <div>
          <p className="eyebrow">Imagen final</p>
          <h3>{deck.deckName}</h3>
        </div>
        {onBack ? (
          <button className="secondary-button" type="button" onClick={onBack}>
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Volver</span>
          </button>
        ) : null}
      </div>

      {isWorking ? (
        <section className="data-panel" aria-label="Generacion en progreso">
          <p className="empty-state">Cacheando cartas y generando la imagen...</p>
        </section>
      ) : null}

      {result ? (
        <DeckGenerationResultPanel result={result} />
      ) : !isWorking ? (
        <section className="data-panel" aria-label="Generacion pendiente">
          <p className="empty-state">La generacion iniciara automaticamente desde la accion seleccionada.</p>
        </section>
      ) : null}
    </div>
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

function DeckGenerationResultPanel({ result }: { result: GenerationResult }) {
  const previewUrl = result.generatedImage ? buildImageUrl(result.generatedImage.storagePath) : null;

  return (
    <section className="data-panel" aria-label="Resultado de generacion de imagen">
      <div className="section-header">
        <div>
          <h4>Imagen del deck</h4>
          <p className="empty-state">{result.deckId}</p>
        </div>
        {previewUrl ? (
          <a className="secondary-button" download href={previewUrl}>
            <Download size={18} aria-hidden="true" />
            <span>Descargar PNG</span>
          </a>
        ) : null}
      </div>

      <div className="resolution-summary">
        <Metric label="Nuevas" value={result.cacheResult.cached.length} />
        <Metric label="Existentes" value={result.cacheResult.alreadyCached.length} />
        <Metric label="Faltantes" value={result.cacheResult.missing.length} />
      </div>

      {result.cacheResult.missing.length > 0 ? (
        <div className="table-list" aria-label="Cartas faltantes">
          {result.cacheResult.missing.map((item, index) => (
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

      {previewUrl && result.generatedImage ? (
        <div className="deck-image-preview">
          <img alt="Imagen generada del deck" src={previewUrl} />
          <div className="table-list">
            <article className="table-row">
              <div>
                <strong>{result.generatedImage.generatedImageId}</strong>
                <span>{result.generatedImage.storagePath}</span>
              </div>
              <span>{result.generatedImage.status}</span>
              <span>
                {result.generatedImage.width}x{result.generatedImage.height}
              </span>
            </article>
          </div>
        </div>
      ) : null}
    </section>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function buildImageUrl(storagePath: string): string {
  const cleanPath = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");

  return `${IMAGE_STORAGE_BASE_URL.replace(/\/$/, "")}/${cleanPath}`;
}

function useIsMobileLayout() {
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window === "undefined" || !window.matchMedia ? false : window.matchMedia("(max-width: 860px)").matches
  );

  useEffect(() => {
    if (!window.matchMedia) {
      return;
    }

    const query = window.matchMedia("(max-width: 860px)");
    const updateLayout = () => setIsMobileLayout(query.matches);

    updateLayout();
    query.addEventListener("change", updateLayout);

    return () => query.removeEventListener("change", updateLayout);
  }, []);

  return isMobileLayout;
}
