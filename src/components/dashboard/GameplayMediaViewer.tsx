import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { GameSession } from "@/types/database";

interface GameplayMediaViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "screenshot" | "recording";
  session: GameSession | null;
  /** Optional metadata to show in the header */
  playerName?: string;
  gameTitle?: string;
}

const GameplayMediaViewer = ({
  open,
  onOpenChange,
  type,
  session,
  playerName,
  gameTitle,
}: GameplayMediaViewerProps) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !session) {
      setUrl(null);
      setError(null);
      return;
    }

    const fetchUrl = async () => {
      setLoading(true);
      setError(null);

      const bucket = type === "screenshot" ? "gameplay-screenshots" : "gameplay-recordings";
      const fallbackExt = type === "screenshot" ? "png" : "webm";
      const pathField = type === "screenshot" ? session.screenshot_path : session.recording_path;
      const path = pathField || `${session.user_id}/${session.session_id}.${fallbackExt}`;

      const { data, error: storageError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 600);

      if (storageError || !data?.signedUrl) {
        setError(`No ${type} found for this session`);
      } else {
        setUrl(data.signedUrl);
      }
      setLoading(false);
    };

    fetchUrl();
  }, [open, session, type]);

  const title = type === "screenshot" ? "Gameplay Screenshot" : "Gameplay Recording";
  const score = session?.score != null ? session.score.toLocaleString() : "—";
  const date = session ? new Date(session.started_at).toLocaleString() : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/50 bg-card max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-arcade text-xs text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground flex flex-wrap items-center gap-2">
            {playerName && <span className="text-foreground font-medium">{playerName}</span>}
            {gameTitle && <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">{gameTitle}</Badge>}
            <span>Score: <span className="font-arcade text-primary">{score}</span></span>
            {date && <span className="text-xs">• {date}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <p className="py-12 text-center text-sm text-muted-foreground">{error}</p>
          )}

          {!loading && !error && url && type === "screenshot" && (
            <img
              src={url}
              alt="Gameplay screenshot"
              className="w-full rounded-lg border border-border/30"
            />
          )}

          {!loading && !error && url && type === "recording" && (
            <video
              src={url}
              controls
              autoPlay
              className="w-full rounded-lg border border-border/30 bg-black"
              style={{ maxHeight: "70vh" }}
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameplayMediaViewer;
