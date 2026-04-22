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
  <div className="group overflow-hidden rounded-lg border border-border/50 bg-card transition-all duration-300 hover:neon-border-pink hover:-translate-y-1 flex flex-col h-full">
    <div className="relative h-48 w-full bg-[#0F172A] overflow-hidden shrink-0">
      {thumbnailPath ? (
        <img
          src={thumbUrl(thumbnailPath)}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-neon-pink/20 flex flex-col items-center justify-center">
          <Gamepad2 className="h-12 w-12 text-primary/40 mb-2 transition-transform duration-300 group-hover:scale-110" />
        </div>
      )}

      {/* Top Badges */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        {contestSlug && (
          <div className="flex items-center gap-1.5 rounded-full bg-neon-pink px-3 py-1 text-[11px] font-bold text-white shadow-sm">
            <Trophy className="h-3.5 w-3.5" /> Contest Available
          </div>
        )}
      </div>
    </div>

    <div className="p-5 flex flex-col gap-5 bg-[#172033] flex-1">
      {/* Title & Description */}
      <div>
        <h3 className="mb-2 text-xl font-bold text-white leading-tight capitalize">{title}</h3>
        {description ? (
          <p className="text-[13px] text-slate-300 line-clamp-2">{description}</p>
        ) : (
          <p className="text-[13px] text-slate-300">Play the classic {title} arcade game.</p>
        )}
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-2 gap-3 mt-auto">
        <div className="flex flex-col gap-1.5 rounded-xl bg-[#202B45] p-3.5 border border-white/5">
          <span className="text-xs text-slate-400 font-medium tracking-wide">Plays</span>
          <span className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" />
            {playCount.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl bg-[#202B45] p-3.5 border border-white/5 overflow-hidden">
          <span className="text-xs text-slate-400 font-medium tracking-wide">Top Player</span>
          <span className="text-sm font-semibold text-white flex items-center gap-1.5 truncate">
            {topPlayer ? (
              <>
                <Crown className="h-4 w-4 text-yellow-500 shrink-0" />
                <span className="truncate">{topPlayer}</span>
              </>
            ) : (
              <span className="text-slate-500">None yet</span>
            )}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-1">
        <Button
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg font-bold h-11 transition-transform active:scale-[0.98]"
          asChild
        >
          <Link to={`/free-play/${slug}`}>
            <Play className="mr-2 h-4 w-4" fill="currentColor" /> Free Play
          </Link>
        </Button>
        {contestSlug && (
          <Button
            variant="outline"
            className="flex-1 border-white/10 bg-[#202B45] text-white hover:bg-neon-pink hover:text-white font-bold h-11 transition-all active:scale-[0.98]"
            onClick={onContestClick}
          >
            <Trophy className="mr-2 h-4 w-4" /> Contest
          </Button>
        )}
      </div>
    </div>
  </div>
);

export default GameCard;
