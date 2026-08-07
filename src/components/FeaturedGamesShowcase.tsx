import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import GameCard from "@/components/GameCard";
import { useScrollReveal, staggerDelay } from "@/hooks/useScrollReveal";
import type { Game } from "@/types/database";

export interface FeaturedGamesShowcaseProps {
  games: Game[];
  playCounts: Record<string, number>;
  topPlayers: Record<string, string>;
  contestGameMap: Record<string, string>;
  onContestClick: (gameSlug: string, contestSlug: string) => void;
  limit?: number;
  columns?: 2 | 3 | 4;
  title?: ReactNode | false;
  badge?: string | false;
  showAttentionBanner?: boolean;
  showViewAllButton?: boolean;
  viewAllLink?: string;
  viewAllText?: string;
  className?: string;
  containerClassName?: string;
}

function StaggeredGameCard({
  game,
  index,
  playCounts,
  topPlayers,
  contestGameMap,
  onContestClick,
}: {
  game: Game;
  index: number;
  playCounts: Record<string, number>;
  topPlayers: Record<string, string>;
  contestGameMap: Record<string, string>;
  onContestClick: (slug: string, contestSlug: string) => void;
}) {
  const ref = useScrollReveal<HTMLDivElement>({ variant: "fade-up", delay: staggerDelay(index) });
  return (
    <div ref={ref}>
      <GameCard
        slug={game.slug}
        title={game.title}
        thumbnailPath={game.thumbnail_path}
        previewPath={game.preview_path}
        previewEnabled={game.preview_enabled}
        description={game.description}
        playCount={playCounts[game.id] || 0}
        topPlayer={topPlayers[game.id]}
        contestSlug={contestGameMap[game.id]}
        onContestClick={() => contestGameMap[game.id] && onContestClick(game.slug, contestGameMap[game.id])}
      />
    </div>
  );
}

export function FeaturedGamesShowcase({
  games,
  playCounts,
  topPlayers,
  contestGameMap,
  onContestClick,
  limit,
  columns = 3,
  title,
  badge,
  showAttentionBanner,
  showViewAllButton,
  viewAllLink = "/games",
  viewAllText = "View All Games",
  className = "",
  containerClassName = "",
}: FeaturedGamesShowcaseProps) {
  const headerRef = useScrollReveal<HTMLDivElement>({ variant: "scale-in" });
  const displayedGames = typeof limit === "number" ? games.slice(0, limit) : games;

  const gridColsClass =
    columns === 2
      ? "grid gap-6 sm:grid-cols-2"
      : columns === 4
        ? "grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

  const renderHeader = showAttentionBanner || badge !== false || title !== false;

  return (
    <section className={`w-full ${className}`}>
      <div className={`container ${containerClassName}`}>
        {renderHeader && (
          <div ref={headerRef} className="mb-10 flex flex-col items-center text-center">
            {showAttentionBanner && (
              <div className="mb-6 inline-flex items-center rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm">
                <span className="font-bold text-destructive mr-2">ATTENTION:</span>
                <span className="text-foreground">For best gameplay experience use a USB controller!</span>
              </div>
            )}
            {badge !== false && badge && (
              <span className="mb-3 inline-block font-arcade text-[10px] text-accent">
                {badge}
              </span>
            )}
            {title !== false && (
              title ? (
                title
              ) : (
                ''
              )
            )}
          </div>
        )}
        <div className={`${gridColsClass} text-left`}>
          {displayedGames.map((game, i) => (
            <StaggeredGameCard
              key={game.id}
              game={game}
              index={i}
              playCounts={playCounts}
              topPlayers={topPlayers}
              contestGameMap={contestGameMap}
              onContestClick={onContestClick}
            />
          ))}
        </div>
        {showViewAllButton && (
          <div className="mt-10 text-center">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/10" asChild>
              <Link to={viewAllLink}>
                {viewAllText} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default FeaturedGamesShowcase;
