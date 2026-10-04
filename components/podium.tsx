import type { ScoreRow } from "@/lib/data";

function Slot({
  row,
  tone,
  rank,
  champion = false,
}: {
  row: ScoreRow | undefined;
  tone: "gold" | "silver" | "bronze";
  rank: "01" | "02" | "03";
  champion?: boolean;
}) {
  return (
    <div className={`podium-slot ${tone}${row ? "" : " vacant"}`}>
      {champion && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div className="rank-num" style={champion ? { fontSize: 36, marginTop: 4 } : undefined}>
        {rank}
      </div>
      {row ? (
        <>
          <div className="name">{row.name}</div>
          <div className="score" style={champion ? { fontSize: 20 } : undefined}>
            {row.score.toLocaleString("es-ES")}
          </div>
          <div className="date">{row.date}</div>
        </>
      ) : (
        <>
          <div className="name">---</div>
          <div className="date">PUESTO LIBRE</div>
        </>
      )}
    </div>
  );
}

// Funciona con 0, 1, 2 o 3 filas: los puestos sin marca se muestran libres.
export default function Podium({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="podium">
      <Slot row={rows[1]} tone="silver" rank="02" />
      <Slot row={rows[0]} tone="gold" rank="01" champion />
      <Slot row={rows[2]} tone="bronze" rank="03" />
    </div>
  );
}
