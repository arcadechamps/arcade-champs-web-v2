import { useState } from "react";
import { Search, Gamepad2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { Game } from "@/types/database";
import OnboardingTour, { type TourStep } from "@/components/OnboardingTour";

const STORAGE_BASE = "https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public";

const thumbUrl = (path: string, w = 400, h = 225) =>
  `${STORAGE_BASE}/game-thumbnails/${path}?width=${w}&height=${h}&resize=cover&quality=75`;

const TOUR_STEPS: TourStep[] = [
  { targetSelector: '[data-tour="free-search"]', title: "Find Your Game", description: "Type any game name to instantly filter the library. Quick and easy!", position: "bottom" },
  { targetSelector: '[data-tour="free-game-card"]', title: "Pick & Play!", description: "Each card is a free game — no fees, no time limits. Hit Play and enjoy!", position: "bottom" },
];

interface DashboardFreeGamesProps {
  games: Game[];
}

const DashboardFreeGames = ({ games }: DashboardFreeGamesProps) => {
  const [search, setSearch] = useState("");
  const activeGames = games.filter(g => g.is_active);
  const filtered = activeGames.filter(g =>
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-arcade text-xs text-foreground">Free Games</h2>
          <p className="mt-1 text-xs text-muted-foreground">Play any game for free — no time limits!</p>
        </div>
        <div className="relative max-w-xs" data-tour="free-search">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary/50 py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Gamepad2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {search ? "No games match your search." : "No games available yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((game, i) => (
            <div
              key={game.id}
              className="group overflow-hidden rounded-lg border border-border/50 bg-card transition-all hover:neon-border hover:-translate-y-0.5"
              {...(i === 0 ? { "data-tour": "free-game-card" } : {})}
            >
              <div className="flex aspect-video items-center justify-center bg-secondary/30 overflow-hidden">
                {game.thumbnail_path ? (
                  <img
                    src={thumbUrl(game.thumbnail_path)}
                    alt={game.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <Gamepad2 className="h-12 w-12 text-primary/30" />
                )}
              </div>
              <div className="p-3">
                <h3 className="mb-2 font-arcade text-[10px] leading-relaxed text-foreground">{game.title}</h3>
                {game.description && (
                  <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{game.description}</p>
                )}
                <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/80 text-xs gap-1" asChild>
                  <Link to={`/free-play/${game.slug}`}>
                    <Play className="h-3 w-3" /> Play Now
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <OnboardingTour steps={TOUR_STEPS} storageKey="tour-player-free-games" />
      )}
    </div>
  );
};

export default DashboardFreeGames;
