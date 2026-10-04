import LibraryView from "@/components/library-view";
import { getGameStats, getGames } from "@/lib/games-repo";

export default async function Biblioteca() {
  const [games, stats] = await Promise.all([getGames(), getGameStats()]);
  return <LibraryView games={games} stats={stats} />;
}
