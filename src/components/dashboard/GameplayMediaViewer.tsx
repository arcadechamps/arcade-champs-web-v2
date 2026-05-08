import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [urlT15, setUrlT15] = useState<string | null>(null);
  const [urlT10, setUrlT10] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"final" | "t15" | "t10">("final");
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

      if (type === "screenshot") {
        const basePath = `${session.user_id}/${session.session_id}`;
        
        // Fetch Final (or default)
        const path = session.screenshot_path || `${basePath}.png`;
        const { data: data3 } = await supabase.storage.from("gameplay-screenshots").createSignedUrl(path, 600);
        if (data3?.signedUrl) setUrl(data3.signedUrl);
        else setError("No screenshot found for this session");

        // Fetch T-15s
        const path1 = `${basePath}_1.png`;
        const { data: data1 } = await supabase.storage.from("gameplay-screenshots").createSignedUrl(path1, 600);
        if (data1?.signedUrl) setUrlT15(data1.signedUrl);

        // Fetch T-10s
        const path2 = `${basePath}_2.png`;
        const { data: data2 } = await supabase.storage.from("gameplay-screenshots").createSignedUrl(path2, 600);
        if (data2?.signedUrl) setUrlT10(data2.signedUrl);
      } else {
        const path = session.recording_path || `${session.user_id}/${session.session_id}.webm`;
        const { data, error: storageError } = await supabase.storage
          .from("gameplay-recordings")
          .createSignedUrl(path, 600);

        if (storageError || !data?.signedUrl) {
          setError(`No recording found for this session`);
        } else {
          setUrl(data.signedUrl);
        }
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
            <div className="space-y-4">
              {(urlT15 || urlT10) && (
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant={activeTab === "t15" ? "default" : "outline"} 
                    size="sm" 
                    disabled={!urlT15}
                    onClick={() => setActiveTab("t15")}
                  >
                    T-15s
                  </Button>
                  <Button 
                    variant={activeTab === "t10" ? "default" : "outline"} 
                    size="sm" 
                    disabled={!urlT10}
                    onClick={() => setActiveTab("t10")}
                  >
                    T-10s
                  </Button>
                  <Button 
                    variant={activeTab === "final" ? "default" : "outline"} 
                    size="sm" 
                    disabled={!url}
                    onClick={() => setActiveTab("final")}
                  >
                    Final
                  </Button>
                </div>
              )}
              <img
                src={activeTab === "t15" && urlT15 ? urlT15 : activeTab === "t10" && urlT10 ? urlT10 : url}
                alt="Gameplay screenshot"
                className="w-full rounded-lg border border-border/30"
              />
            </div>
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
