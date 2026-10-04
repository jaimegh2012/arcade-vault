import HomeView from "@/components/home-view";
import { getGames } from "@/lib/games-repo";

export default async function Home() {
  const games = (await getGames()).slice(0, 6);
  return <HomeView games={games} />;
}
