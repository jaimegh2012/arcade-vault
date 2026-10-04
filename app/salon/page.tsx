import Link from "next/link";
import Podium from "@/components/podium";
import { ScoresEmpty, ScoresError } from "@/components/scores-state";
import type { Game, ScoreRow } from "@/lib/data";
import { getGames, getTopScores } from "@/lib/games-repo";

export default async function HallOfFamePage(props: PageProps<"/salon">) {
  const { juego } = await props.searchParams;
  const requested = Array.isArray(juego) ? juego[0] : juego;

  let games: Game[] = [];
  let rows: ScoreRow[] = [];
  let failed = false;
  let game: Game | undefined;

  try {
    games = await getGames();
    // Un id inválido cae al primer juego
    game = games.find((g) => g.id === requested) ?? games[0];
    if (game) rows = await getTopScores(game.id, 20);
  } catch (err) {
    console.error("[salon] Error cargando el ranking:", err);
    failed = true;
  }

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      {games.length > 0 && (
        <nav className="hall-tabs" aria-label="Juegos">
          {games.map((g) => (
            <Link
              key={g.id}
              href={`/salon?juego=${g.id}`}
              className={"chip" + (game?.id === g.id ? " active" : "")}
              aria-current={game?.id === g.id ? "page" : undefined}
            >
              {g.title}
            </Link>
          ))}
        </nav>
      )}

      {failed || !game ? (
        <ScoresError />
      ) : rows.length === 0 ? (
        <ScoresEmpty gameId={game.id} />
      ) : (
        <>
          <Podium rows={rows.slice(0, 3)} />

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.rank}
                className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
