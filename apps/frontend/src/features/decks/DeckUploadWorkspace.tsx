import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, ImageUp, ShieldCheck } from "lucide-react";
import { deckApi, UploadDeckResponse } from "./deck-api";
import { StoreEventType, StoreSummary, StoreTournamentType, storeApi } from "../stores/store-api";

type DeckUploadWorkspaceProps = {
  accessToken: string;
  defaultStoreId?: string | null;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

export function DeckUploadWorkspace({ accessToken, defaultStoreId }: DeckUploadWorkspaceProps) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastUpload, setLastUpload] = useState<UploadDeckResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [storeId, setStoreId] = useState(defaultStoreId ?? "");
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [eventTypes, setEventTypes] = useState<StoreEventType[]>([]);
  const [tournamentTypes, setTournamentTypes] = useState<StoreTournamentType[]>([]);

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

  useEffect(() => {
    if (!storeId) {
      setEventTypes([]);
      setTournamentTypes([]);
      return;
    }

    Promise.all([
      storeApi.listEventTypes(accessToken, storeId),
      storeApi.listTournamentTypes(accessToken, storeId)
    ])
      .then(([events, tournaments]) => {
        setEventTypes(events);
        setTournamentTypes(tournaments);
      })
      .catch((error: unknown) => {
        setFeedback({
          tone: "error",
          message: error instanceof Error ? error.message : "No fue posible cargar eventos y torneos."
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
        tournamentDate: String(formData.get("tournamentDate") ?? ""),
        resultLabel: String(formData.get("resultLabel") ?? ""),
        deckName: String(formData.get("deckName") ?? ""),
        tournamentName: String(formData.get("tournamentName") ?? ""),
        eventTypeId: String(formData.get("eventTypeId") ?? ""),
        tournamentTypeId: String(formData.get("tournamentTypeId") ?? ""),
        location: String(formData.get("location") ?? ""),
        deckListImage: selectedFile
      });

      setLastUpload(result);
      setFeedback({
        tone: "success",
        message: `Deck cargado con estado ${result.status}.`
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
          Fecha del torneo
          <input name="tournamentDate" required type="date" />
        </label>
        <label>
          Resultado
          <input name="resultLabel" placeholder="Top 8 o Ganador" required type="text" />
        </label>
        <label>
          Deck usado
          <input name="deckName" required type="text" />
        </label>
        <label>
          Torneo
          <input name="tournamentName" type="text" />
        </label>
        <label>
          Tipo de evento
          <select name="eventTypeId">
            <option value="">Sin tipo de evento</option>
            {eventTypes.map((eventType) => (
              <option key={eventType.id} value={eventType.id}>
                {eventType.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo de torneo
          <select name="tournamentTypeId">
            <option value="">Sin tipo de torneo</option>
            {tournamentTypes.map((tournamentType) => (
              <option key={tournamentType.id} value={tournamentType.id}>
                {tournamentType.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ubicacion
          <input name="location" type="text" />
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
            </article>
          </div>
        </section>
      ) : null}
    </div>
  );
}
