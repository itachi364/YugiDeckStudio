import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, ListChecks, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { deckApi, EditableDeckCard, ExtractDeckResponse } from "./deck-api";

type DeckReviewWorkspaceProps = {
  accessToken: string;
  deckId: string;
  onBack?: () => void;
  onDeckChanged?: (deckId: string, status: string, reviewStatus: string) => void;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

const deckSections: EditableDeckCard["section"][] = ["MAIN", "EXTRA", "SIDE"];

export function DeckReviewWorkspace({ accessToken, deckId, onBack, onDeckChanged }: DeckReviewWorkspaceProps) {
  const [cards, setCards] = useState<EditableDeckCard[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [hasUnsavedCorrections, setHasUnsavedCorrections] = useState(false);

  const deckTotals = calculateDeckTotals(cards);
  const deckCompositionMessages = getDeckCompositionMessages(deckTotals);
  const isDeckCompositionValid = deckCompositionMessages.length === 0;
  const isReviewConfirmed = reviewStatus === "CONFIRMED";
  const canConfirm = cards.length > 0 && !hasUnsavedCorrections && isDeckCompositionValid && !isReviewConfirmed;

  const runDeckAction = async (action: () => Promise<void>) => {
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

  const loadImportedCards = () =>
    runDeckAction(async () => {
      const result = await deckApi.getDeckCards(accessToken, deckId);
      loadExtraction(result);
      setFeedback({
        tone: "success",
        message: `Deck cargado para revision con ${result.cards.length} registros.`
      });
    });

  useEffect(() => {
    void loadImportedCards();
  }, [accessToken, deckId]);

  const handleSaveCorrections = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    runDeckAction(async () => {
      const result = await deckApi.updateDeckCards(accessToken, deckId, normalizeCards(cards));
      loadExtraction(result);
      setFeedback({
        tone: "success",
        message: "Revision del deck guardada."
      });
    });
  };

  const handleConfirm = () =>
    runDeckAction(async () => {
      if (!canConfirm) {
        setFeedback({
          tone: "error",
          message: hasUnsavedCorrections
            ? "Guarda los cambios antes de confirmar el deck."
            : "Completa la composicion del deck antes de confirmar."
        });
        return;
      }

      const result = await deckApi.confirmDeckReview(accessToken, deckId);
      setReviewStatus(result.reviewStatus);
      onDeckChanged?.(deckId, result.status, result.reviewStatus);
      setFeedback({
        tone: "success",
        message: `Deck confirmado con ${result.cardCount} cartas.`
      });
    });

  const loadExtraction = (result: ExtractDeckResponse) => {
    setCards(result.cards);
    setReviewStatus(result.reviewStatus);
    setHasUnsavedCorrections(false);
  };

  const markCorrectionsAsChanged = () => {
    setHasUnsavedCorrections(true);
    if (reviewStatus !== "CONFIRMED") {
      setReviewStatus("PENDING");
    }
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
    markCorrectionsAsChanged();
  };

  const removeCard = (index: number) => {
    setCards((currentCards) =>
      currentCards
        .filter((_, cardIndex) => cardIndex !== index)
        .map((card, cardIndex) => ({
          ...card,
          displayOrder: cardIndex + 1
        }))
    );
    markCorrectionsAsChanged();
  };

  const addCard = () => {
    setCards((currentCards) => [
      ...currentCards,
      {
        section: "MAIN",
        quantity: 1,
        originalName: "",
        displayOrder: currentCards.length + 1
      }
    ]);
    markCorrectionsAsChanged();
  };

  return (
    <div className="deck-review-layout">
      <div className="section-header">
        <div>
          <p className="eyebrow">Revision de deck</p>
          <h3>Revisar composicion</h3>
        </div>
        <div className="inline-actions">
          {onBack ? (
            <button className="secondary-button" type="button" onClick={onBack}>
              <ArrowLeft size={18} aria-hidden="true" />
              <span>Volver</span>
            </button>
          ) : null}
          <button className="secondary-button" disabled={isWorking} type="button" onClick={loadImportedCards}>
            <RefreshCw size={18} aria-hidden="true" />
            <span>{isWorking ? "Procesando" : "Recargar"}</span>
          </button>
        </div>
      </div>

      <section className="data-panel" aria-label="Deck seleccionado">
        <div className="table-row">
          <div>
            <strong>{deckId}</strong>
            <span>Deck ID</span>
          </div>
          <span>{reviewStatus ?? "PENDING"}</span>
        </div>
      </section>

      {feedback ? (
        <div className={`feedback ${feedback.tone}`} role="status">
          {feedback.tone === "error" ? <AlertCircle size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <form className="data-panel" aria-label="Revision de cartas" onSubmit={handleSaveCorrections}>
        <div className="section-header">
          <h4>Cartas del deck</h4>
          <div className="inline-actions">
            <button className="secondary-button" disabled={isWorking || isReviewConfirmed} type="button" onClick={addCard}>
              <Plus size={18} aria-hidden="true" />
              <span>Agregar carta</span>
            </button>
            <button className="secondary-button" disabled={isWorking || cards.length === 0 || !hasUnsavedCorrections} type="submit">
              <Save size={18} aria-hidden="true" />
              <span>Guardar revision</span>
            </button>
          </div>
        </div>

        {cards.length > 0 ? (
          <>
            <DeckCompositionSummary totals={deckTotals} messages={deckCompositionMessages} />
            <div className="card-edit-list">
              {cards.map((card, index) => (
                <article className="card-edit-row" key={`${card.displayOrder}-${index}`}>
                  <label>
                    Seccion
                    <select
                      disabled={isReviewConfirmed}
                      value={card.section}
                      onChange={(event) => updateCard(index, "section", event.currentTarget.value)}
                    >
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
                      disabled={isReviewConfirmed}
                      required
                      type="number"
                      value={card.quantity}
                      onChange={(event) => updateCard(index, "quantity", event.currentTarget.value)}
                    />
                  </label>
                  <label>
                    Nombre
                    <input
                      required
                      disabled={isReviewConfirmed}
                      type="text"
                      value={card.originalName}
                      onChange={(event) => updateCard(index, "originalName", event.currentTarget.value)}
                    />
                  </label>
                  <label>
                    Orden
                    <input
                      min={1}
                      disabled={isReviewConfirmed}
                      required
                      type="number"
                      value={card.displayOrder}
                      onChange={(event) => updateCard(index, "displayOrder", event.currentTarget.value)}
                    />
                  </label>
                  <button
                    aria-label={`Eliminar ${card.originalName || "carta sin nombre"}`}
                    className="danger-button"
                    disabled={isWorking || isReviewConfirmed}
                    type="button"
                    onClick={() => removeCard(index)}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                    <span>Eliminar</span>
                  </button>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="empty-state">No hay cartas cargadas para este deck.</p>
        )}
      </form>

      <section className="data-panel" aria-label="Confirmacion de deck">
        <div className="review-footer-actions">
          <button className="primary-button" disabled={isWorking || !canConfirm} type="button" onClick={handleConfirm}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>Confirmar deck</span>
          </button>
        </div>

        {hasUnsavedCorrections && cards.length > 0 ? (
          <p className="empty-state">Guarda los cambios antes de confirmar el deck.</p>
        ) : null}

        {isReviewConfirmed ? (
          <p className="empty-state">La revision del deck ya fue confirmada.</p>
        ) : null}

        {!isDeckCompositionValid && cards.length > 0 ? (
          <div className="validation-list" role="status">
            {deckCompositionMessages.map((message) => (
              <span key={message}>{message}</span>
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

function DeckCompositionSummary({
  totals,
  messages
}: {
  totals: ReturnType<typeof calculateDeckTotals>;
  messages: string[];
}) {
  return (
    <div className="deck-count-panel">
      <Metric label="Main Deck" value={totals.MAIN} />
      <Metric label="Extra Deck" value={totals.EXTRA} />
      <Metric label="Side Deck" value={totals.SIDE} />
      {messages.length === 0 ? (
        <span className="valid-count-message">Composicion valida para confirmar.</span>
      ) : (
        <span className="invalid-count-message">Completa la lista antes de confirmar.</span>
      )}
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

function calculateDeckTotals(cards: EditableDeckCard[]) {
  return cards.reduce<Record<EditableDeckCard["section"], number>>(
    (totals, card) => ({
      ...totals,
      [card.section]: totals[card.section] + Math.max(1, Number(card.quantity) || 1)
    }),
    {
      MAIN: 0,
      EXTRA: 0,
      SIDE: 0
    }
  );
}

function getDeckCompositionMessages(totals: Record<EditableDeckCard["section"], number>) {
  const messages: string[] = [];

  if (totals.MAIN < 40 || totals.MAIN > 60) {
    messages.push("Main Deck debe tener entre 40 y 60 cartas.");
  }

  if (totals.EXTRA > 15) {
    messages.push("Extra Deck no puede tener mas de 15 cartas.");
  }

  if (totals.SIDE > 15) {
    messages.push("Side Deck no puede tener mas de 15 cartas.");
  }

  return messages;
}
