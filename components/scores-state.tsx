"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

// Sin partidas guardadas: invita a abrir el ranking.
export function ScoresEmpty({ gameId, compact = false }: { gameId: string; compact?: boolean }) {
  return (
    <div className={"score-state empty" + (compact ? " compact" : "")}>
      <div className="coin-slot" aria-hidden="true">
        <span />
      </div>
      <div className="ss-title pixel">AÚN NO HAY PUNTUACIONES</div>
      <div className="ss-title pixel neon-yellow">SÉ EL PRIMERO</div>
      <p className="ss-text">Termina una partida y guarda tus iniciales para abrir el ranking.</p>
      <Link href={`/juegos/${gameId}/jugar`} className="btn yellow">
        JUGAR AHORA
      </Link>
    </div>
  );
}

// Fallo de lectura: dice qué pasó y deja reintentar sin recargar la página.
export function ScoresError({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <div role="alert" className={"score-state error" + (compact ? " compact" : "")}>
      <div className="ss-glyph pixel" aria-hidden="true">
        ✕
      </div>
      <div className="ss-title pixel">NO SE PUDO CARGAR EL RANKING</div>
      <p className="ss-text">
        Hubo un problema al leer las puntuaciones. Tus marcas no se han perdido.
      </p>
      <button className="btn magenta" onClick={() => router.refresh()}>
        REINTENTAR
      </button>
    </div>
  );
}
