import { FormEvent, useState } from "react";
import { AlertCircle, CheckCircle2, ListChecks, RefreshCw, Save, SearchCheck, ShieldCheck } from "lucide-react";
import { deckApi, EditableDeckCard, ExtractDeckResponse, ResolveCardNamesResponse } from "./deck-api";

type DeckReviewWorkspaceProps = {
  accessToken: string;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

const deckSections: EditableDeckCard["section"][] = ["MAIN", "EXTRA", "SIDE"];

export function DeckReviewWorkspace({ accessToken }: DeckReviewWorkspaceProps) {
  const [deckId, setDeckId] = useState("");
  const [cards, setCards] = useState<EditableDeckCard[]>([]);
  const [rawOcrText, setRawOcrText] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [resolution, setResolution] = useState<ResolveCardNamesResponse | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);

  const normalizedDeckId = deckId.trim();

  const runDeckAction = async (action: () => Promise<void>) => {
    if (!normalizedDeckId) {
      setFeedback({
        tone: "error",
        message: "El Deck ID es obligatorio para revisar la extraccion."
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

  const handleExtract = () =>
    runDeckAction(async () => {
      const result = await deckApi.extractDeckList(accessToken, normalizedDeckId);
      loadExtraction(result);
      setResolution(null);
      setFeedback({
        tone: "success",
        message: `Extraccion ${result.extractionStatus} con ${result.cards.length} cartas.`
      });
    });

  const handleSaveCorrections = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    runDeckAction(async () => {
      const result = await deckApi.updateDeckCards(accessToken, normalizedDeckId, normalizeCards(cards));
      loadExtraction(result);
      setResolution(null);
      setFeedback({
        tone: "success",
        message: "Correcciones guardadas."
      });
    });
  };

  const handleResolve = () =>
    runDeckAction(async () => {
      const result = await deckApi.resolveCardNames(accessToken, normalizedDeckId);
      setResolution(result);
      setFeedback({
        tone: result.unresolved > 0 || result.ambiguous > 0 ? "error" : "success",
        message: `Resolucion: ${result.resolved} resueltas, ${result.ambiguous} ambiguas, ${result.unresolved} no resueltas.`
      });
    });

  const handleConfirm = () =>
    runDeckAction(async () => {
      const result = await deckApi.confirmDeckReview(accessToken, normalizedDeckId);
      setReviewStatus(result.reviewStatus);
      setFeedback({
        tone: "success",
        message: `Revision confirmada con ${result.cardCount} cartas.`
      });
    });

  const loadExtraction = (result: ExtractDeckResponse) => {
    setCards(result.cards);
    setRawOcrText(result.rawOcrText);
    setReviewStatus(null);
  };

  const updateCard = (index: number, field: keyof EditableDeckCard, value: string) => {
    setCards((currentCards) =>
      currentCards.map((card, cardIndex) => {
        if (cardIndex !== index) {
          return card;
        }

        if (field === "quantity" || field === "displayOrder") {
          return {
            ...card,
            [field]: Number(value)
          };
        }

        return {
          ...card,
          [field]: value
        };
      })
    );
  };

  return (
    <div className="deck-review-layout">
      <div className="section-header">
        <div>
          <p className="eyebrow">Revision OCR</p>
          <h3>Revisar extraccion</h3>
        </div>
      </div>

      {feedback ? (
        <div className={`feedback ${feedback.tone}`} role="status">
          {feedback.tone === "error" ? <AlertCircle size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <section className="data-panel" aria-label="Seleccion de deck">
        <div className="review-actions">
          <label>
            Deck ID
            <input
              name="deckId"
              placeholder="uuid del deck cargado"
              required
              type="text"
              value={deckId}
              onChange={(event) => setDeckId(event.currentTarget.value)}
            />
          </label>
          <button className="secondary-button" disabled={isWorking} type="button" onClick={handleExtract}>
            <RefreshCw size={18} aria-hidden="true" />
            <span>{isWorking ? "Procesando" : "Ejecutar OCR"}</span>
          </button>
        </div>
      </section>

      {rawOcrText ? (
        <section className="data-panel" aria-label="Texto OCR original">
          <h4>Texto OCR original</h4>
          <pre className="ocr-text">{rawOcrText}</pre>
        </section>
      ) : null}

      <form className="data-panel" aria-label="Correccion de cartas" onSubmit={handleSaveCorrections}>
        <div className="section-header">
          <h4>Cartas extraidas</h4>
          <button className="secondary-button" disabled={isWorking || cards.length === 0} type="submit">
            <Save size={18} aria-hidden="true" />
            <span>Guardar correcciones</span>
          </button>
        </div>

        {cards.length > 0 ? (
          <div className="card-edit-list">
            {cards.map((card, index) => (
              <article className="card-edit-row" key={`${card.displayOrder}-${index}`}>
                <label>
                  Seccion
                  <select value={card.section} onChange={(event) => updateCard(index, "section", event.currentTarget.value)}>
                    {deckSections.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cantidad
                  <input
                    min={1}
                    required
                    type="number"
                    value={card.quantity}
                    onChange={(event) => updateCard(index, "quantity", event.currentTarget.value)}
                  />
                </label>
                <label>
                  Nombre original
                  <input
                    required
                    type="text"
                    value={card.originalName}
                    onChange={(event) => updateCard(index, "originalName", event.currentTarget.value)}
                  />
                </label>
                <label>
                  Orden
                  <input
                    min={1}
                    required
                    type="number"
                    value={card.displayOrder}
                    onChange={(event) => updateCard(index, "displayOrder", event.currentTarget.value)}
                  />
                </label>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">Ejecuta OCR para cargar cartas extraidas.</p>
        )}
      </form>

      <section className="data-panel" aria-label="Resolucion y confirmacion">
        <div className="review-footer-actions">
          <button className="secondary-button" disabled={isWorking || cards.length === 0} type="button" onClick={handleResolve}>
            <SearchCheck size={18} aria-hidden="true" />
            <span>Resolver nombres</span>
          </button>
          <button className="primary-button" disabled={isWorking || cards.length === 0} type="button" onClick={handleConfirm}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>Confirmar revision</span>
          </button>
        </div>

        {resolution ? (
          <div className="resolution-summary">
            <Metric label="Resueltas" value={resolution.resolved} />
            <Metric label="Ambiguas" value={resolution.ambiguous} />
            <Metric label="No resueltas" value={resolution.unresolved} />
          </div>
        ) : null}

        {resolution ? (
          <div className="table-list" aria-label="Resultado de resolucion">
            {resolution.cards.map((card) => (
              <article className="table-row" key={card.deckCardId}>
                <div>
                  <strong>{card.originalName}</strong>
                  <span>{card.resolvedEnglishName || "Sin nombre resuelto"}</span>
                </div>
                <span>{card.resolutionStatus}</span>
                <span>{card.cardId || "Sin carta vinculada"}</span>
              </article>
            ))}
          </div>
        ) : null}

        {reviewStatus ? (
          <div className="review-status">
            <ListChecks size={18} aria-hidden="true" />
            <strong>{reviewStatus}</strong>
          </div>
        ) : null}
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

function normalizeCards(cards: EditableDeckCard[]) {
  return cards.map((card, index) => ({
    ...card,
    quantity: Math.max(1, Number(card.quantity) || 1),
    displayOrder: Math.max(1, Number(card.displayOrder) || index + 1),
    originalName: card.originalName.trim()
  }));
}
