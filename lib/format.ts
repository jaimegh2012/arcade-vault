// "12.4K" a partir de un conteo real; por debajo de 1000 se muestra el número tal cual.
export function formatPlays(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function formatBest(best: number | null): string {
  return best === null ? "—" : best.toLocaleString("es-ES");
}
