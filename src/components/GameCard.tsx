import { Play, Trophy, Gamepad2, Users, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const STORAGE_BASE = "https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public";

const thumbUrl = (path: string, w = 400, h = 225) =>
  `${STORAGE_BASE}/game-thumbnails/${path}?width=${w}&height=${h}&resize=cover&quality=75`;

interface GameCardProps {
  slug: string;
  title: string;
  thumbnailPath?: string | null;
  description?: string | null;
  playCount?: number;
  topPlayer?: string | null;
  contestSlug?: string | null;
  onContestClick?: () => void;
}

const GameCard = ({
  slug,
  title,
  thumbnailPath,
  description,
  playCount = 0,
  topPlayer,
  contestSlug,
  onContestClick,
}: GameCardProps) => (
  <div className="group overflow-hidden rounded-lg border border-border/50 bg-card transition-all duration-300 hover:neon-border hover:-translate-y-1">
    <div className="flex aspect-video items-center justify-center bg-secondary/30 overflow-hidden">
      {thumbnailPath ? (
        <img
          src={thumbUrl(thumbnailPath)}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <Gamepad2 className="h-16 w-16 text-primary/30 transition-colors group-hover:text-primary/60" />
      )}
    </div>
    <div className="p-4">
      <h3 className="mb-1 font-arcade text-[10px] leading-relaxed text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{description}</p>
      )}
      <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3 text-primary" />
          {playCount} {playCount === 1 ? "play" : "plays"}
        </span>
        {topPlayer && (
          <span className="flex items-center gap-1">
            <Crown className="h-3 w-3 text-neon-pink" />
            {topPlayer}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" className={`${contestSlug ? 'flex-1' : 'w-full'} bg-primary text-primary-foreground hover:bg-primary/80 text-xs`} asChild>
          <Link to={`/free-play/${slug}`}>
            <Play className="mr-1 h-3 w-3" /> Play
          </Link>
        </Button>
        {contestSlug && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-accent text-accent hover:bg-accent/10 text-xs"
            onClick={onContestClick}
          >
            <Trophy className="mr-1 h-3 w-3" /> Contest
          </Button>
        )}
      </div>
    </div>
  </div>
);

export default GameCard;
