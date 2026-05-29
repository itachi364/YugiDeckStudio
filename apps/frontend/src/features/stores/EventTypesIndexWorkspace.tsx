import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarPlus, Lock, ShieldCheck } from "lucide-react";
import { StoreTournament, storeApi } from "./store-api";

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

export function EventTypesIndexWorkspace({ accessToken }: EventTypesIndexWorkspaceProps) {
  const [tournaments, setTournaments] = useState<StoreTournament[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isWorking, setIsWorking] = useState(false);

  const visibleCount = useMemo(() => tournaments.length, [tournaments]);

  const loadTournaments = useCallback(async () => {
    setIsWorking(true);
    setFeedback(null);

    try {
      const result = await storeApi.listVisibleTournaments(accessToken);
      setTournaments(result);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No fue posible cargar los torneos."
      });
    } finally {
      setIsWorking(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  const handleCloseTournament = async (tournament: StoreTournament) => {
    const storeId = tournament.storeId ?? tournament.store?.id ?? "";

    if (!storeId) {
      setFeedback({
        tone: "error",
        message: "El torneo no tiene tienda asociada para cerrarlo."
      });
      return;
    }

    setIsWorking(true);
    setFeedback(null);

    try {
      const closedTournament = await storeApi.closeTournament(accessToken, storeId, tournament.id);
      setTournaments((current) =>
        current.map((item) => (item.id === closedTournament.id ? { ...item, ...closedTournament } : item))
      );
      setFeedback({
        tone: "success",
        message: `Torneo ${closedTournament.name} cerrado.`
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No fue posible cerrar el torneo."
      });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="events-index-layout">
      <div className="section-header">
        <div>
          <p className="eyebrow">Torneos</p>
          <h3>Listado de torneos</h3>
        </div>
      </div>

      {feedback ? (
        <div className={`feedback ${feedback.tone}`} role="status">
          {feedback.tone === "error" ? <AlertCircle size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <section className="metric compact" aria-label="Estadistica de torneos">
        <span>Torneos visibles</span>
        <strong>{visibleCount}</strong>
      </section>

      <section className="data-panel" aria-label="Listado de torneos configurados">
        {tournaments.length === 0 ? (
          <p className="empty-state">{isWorking ? "Cargando torneos." : "Sin torneos configurados visibles."}</p>
        ) : (
          <div className="table-list">
            {tournaments.map((tournament) => {
              const canClose = tournament.status === "OPEN" && tournament.decks?.some((deck) => deck.resultLabel === "Ganador");

              return (
                <article className="event-table-row" key={tournament.id}>
                  <div>
                    <strong>{tournament.name}</strong>
                    <span>{tournament.eventType?.name ?? "Sin evento asociado"}</span>
                  </div>
                  <div>
                    <span>Tienda</span>
                    <strong>{tournament.store?.name ?? tournament.storeId ?? "Sin tienda"}</strong>
                  </div>
                  <span className={`status-pill ${tournament.status === "OPEN" ? "active" : "inactive"}`}>
                    {tournament.status === "OPEN" ? "Abierto" : "Cerrado"}
                  </span>
                  <div className="row-actions">
                    <span className="mode-pill">{tournament._count?.decks ?? tournament.decks?.length ?? 0} decks</span>
                    <button
                      className="secondary-button"
                      disabled={isWorking || !canClose}
                      type="button"
                      onClick={() => void handleCloseTournament(tournament)}
                    >
                      {canClose ? <Lock size={16} aria-hidden="true" /> : <CalendarPlus size={16} aria-hidden="true" />}
                      <span>Cerrar torneo</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
