import { useState, useEffect, useRef } from "react";
import { Play, Trophy, Gamepad2, Users, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { fetchAndCachePreview, getCachedPreview } from "@/lib/previewCache";

const STORAGE_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public`;

const thumbUrl = (path: string, w = 400, h = 225) =>
  `${STORAGE_BASE}/game-thumbnails/${path}?width=${w}&height=${h}&resize=cover&quality=75`;

interface GameCardProps {
  slug: string;
  title: string;
  thumbnailPath?: string | null;
  previewPath?: string | null;
  previewEnabled?: boolean;
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
  previewPath,
  previewEnabled = true,
  description,
  playCount = 0,
  topPlayer,
  contestSlug,
  onContestClick,
}: GameCardProps) => {
  // Derive these first — used in the useState lazy initialiser below.
  const remotePreviewUrl =
    previewEnabled && previewPath
      ? `${STORAGE_BASE}/game-thumbnails/${previewPath}`
      : null;

  const isVideo =
    previewPath?.endsWith(".mp4") || previewPath?.endsWith(".webm");

  const [isHovered, setIsHovered] = useState(false);
  const [hasFinishedPlaying, setHasFinishedPlaying] = useState(false);

  // Blob URL state — undefined = not fetched, null = loading, string = ready
  // Seed from sessionStorage-backed cache so restored clips show instantly.
  const [blobUrl, setBlobUrl] = useState<string | null | undefined>(
    () => (remotePreviewUrl ? getCachedPreview(remotePreviewUrl) ?? undefined : undefined)
  );
  const [fetchFailed, setFetchFailed] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // On first hover, kick off a single fetch and cache the blob URL.
  // If blobUrl is already set (restored from sessionStorage), skip the fetch.
  useEffect(() => {
    if (!isHovered || !remotePreviewUrl || blobUrl !== undefined) return;

    // Check cache one more time in case another card fetched it after mount.
    const cached = getCachedPreview(remotePreviewUrl);
    if (cached) {
      setBlobUrl(cached);
      return;
    }

    setBlobUrl(null); // mark as loading

    fetchAndCachePreview(remotePreviewUrl).then((url) => {
      setBlobUrl(url);
    }).catch(() => {
      setFetchFailed(true);
      setBlobUrl(remotePreviewUrl); // graceful fallback
    });
  }, [isHovered, remotePreviewUrl, blobUrl]);

  // Play/pause the video element as hover state changes, without re-mounting it.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    if (isHovered && blobUrl && !hasFinishedPlaying) {
      video.currentTime = 0;
      video.play().catch(() => {/* autoplay blocked — silent fail */ });
    } else {
      video.pause();
    }
  }, [isHovered, blobUrl, hasFinishedPlaying, isVideo]);

  // GIF fallback: 10-second timeout since GIFs have no onEnded event
  useEffect(() => {
    if (!isHovered || isVideo || !remotePreviewUrl || hasFinishedPlaying) return;
    const timer = setTimeout(() => setHasFinishedPlaying(true), 10000);
    return () => clearTimeout(timer);
  }, [isHovered, isVideo, remotePreviewUrl, hasFinishedPlaying]);

  const showPreview = isHovered && blobUrl && !hasFinishedPlaying;
  const isLoading = isHovered && remotePreviewUrl && blobUrl === null;

  return (
    <div
      className="group overflow-hidden rounded-lg border border-border/50 bg-card transition-all duration-300 hover:neon-border-pink hover:-translate-y-1 flex flex-col h-full"
      onMouseEnter={() => {
        setIsHovered(true);
        setHasFinishedPlaying(false);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setHasFinishedPlaying(false);
      }}
    >
      <div className="relative h-64 w-full bg-[#0F172A] overflow-hidden shrink-0">

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A] z-10">
            <Loader2 className="h-8 w-8 text-neon-pink animate-spin" />
          </div>
        )}

        {/* Static thumbnail — always rendered, hidden when preview is active */}
        {thumbnailPath ? (
          <img
            src={thumbUrl(thumbnailPath)}
            alt={title}
            className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105  ${showPreview ? "opacity-0" : "opacity-80"}`}
            loading="lazy"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-neon-pink/20 flex flex-col items-center justify-center transition-opacity duration-500 ${showPreview ? "opacity-0" : "opacity-100"}`}>
            <Gamepad2 className="h-12 w-12 text-primary/40 mb-2 transition-transform duration-300 group-hover:scale-110" />
          </div>
        )}

        {/* Video preview — kept mounted after first load to avoid re-fetching */}
        {isVideo && blobUrl && (
          <video
            ref={videoRef}
            src={blobUrl}
            muted
            playsInline
            onEnded={() => setHasFinishedPlaying(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:scale-105 ${showPreview ? "opacity-80" : "opacity-0 pointer-events-none"}`}
          />
        )}

        {/* GIF / image preview */}
        {!isVideo && blobUrl && (
          <img
            src={blobUrl}
            alt={`${title} preview`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:scale-105 ${showPreview ? "opacity-80" : "opacity-0 pointer-events-none"}`}
          />
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
};

export default GameCard;
