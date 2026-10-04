import Link from "next/link";
import { notFound } from "next/navigation";
import Leaderboard from "@/components/leaderboard";
import { formatBest, formatPlays } from "@/lib/format";
import { getGame, getGameStats, getTopScores } from "@/lib/games-repo";

export default async function GameDetailPage(props: PageProps<"/juegos/[id]">) {
  const { id } = await props.params;
  const game = await getGame(id);
  if (!game) notFound();

  const [allStats, scores] = await Promise.all([getGameStats(), getTopScores(id, 10)]);
  const stats = allStats[id] ?? { best: null, plays: 0 };

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.category}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{formatPlays(stats.plays)}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{ color: "var(--magenta)", textShadow: "0 0 6px rgba(255,0,110,0.5)" }}
              >
                {formatBest(stats.best)}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/juegos/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/biblioteca" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <Leaderboard title="MEJORES PUNTUACIONES" scores={scores} />
      </aside>
    </div>
  );
}
