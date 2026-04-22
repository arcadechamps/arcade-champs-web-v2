import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { ArrowLeft, Gamepad2, Keyboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import GamePlayer from "@/components/GamePlayer";
import KeymapOverlay from "@/components/KeymapOverlay";
import { getGameConfig } from "@/data/games-config";
import type { Game } from "@/types/database";
import type { DbKeymapping } from "@/data/keymappings";

const FreePlay = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<(Game & { rom_path?: string; core?: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    const fetchGame = async () => {
      const { data } = await supabase
        .from("games")
        .select("*")
        .eq("slug", gameId)
        .eq("is_active", true)
        .maybeSingle();
      setGame(data as any);
      setLoading(false);
    };
    fetchGame();
  }, [gameId]);

  if (loading) {
    return (
      <Layout>
        <PageMeta title="Loading..." />
        <section className="bg-grid py-16">
          <div className="container flex items-center justify-center py-20">
            <Gamepad2 className="h-8 w-8 animate-pulse text-primary" />
          </div>
        </section>
      </Layout>
    );
  }

  if (!game) {
    return (
      <Layout>
        <PageMeta title="Game Not Found" />
        <section className="bg-grid py-16">
          <div className="container flex flex-col items-center justify-center py-20 text-center">
            <Gamepad2 className="mb-4 h-16 w-16 text-muted-foreground/40" />
            <h1 className="mb-2 font-arcade text-lg text-foreground">Game Not Found</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              The game you're looking for doesn't exist or isn't active.
            </p>
            <Button asChild>
              <Link to="/games">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
              </Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const config = getGameConfig(game.slug);

  const STORAGE_BASE = "https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public";
  const thumbnailUrl = game.thumbnail_path
    ? `${STORAGE_BASE}/game-thumbnails/${game.thumbnail_path}`
    : undefined;

  const generateGameSchema = () => {
    return {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      "name": game.title,
      "description": config?.description ?? game.description ?? `Play ${game.title} for free on Arcade Champs.`,
      "playMode": "SinglePlayer",
      "applicationCategory": "Game",
      "gamePlatform": "Web Browser",
      "operatingSystem": "Any",
      "genre": "Arcade",
      ...(thumbnailUrl ? { "image": thumbnailUrl } : {}),
      "publisher": {
        "@type": "Organization",
        "name": "Arcade Champs",
        "url": "https://play.arcadechamps.com",
      },
      "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
      },
      "url": `https://play.arcadechamps.com/free-play/${game.slug}`
    };
  };

  return (
    <Layout>
      <PageMeta
        title={`${game.title} - Free Play`}
        description={`Play ${game.title} for free on Arcade Champs.`}
        schema={generateGameSchema()}
        ogImage={thumbnailUrl}
        canonicalUrl={`/free-play/${game.slug}`}
      />
      <section className="bg-grid py-6">
        <div className="container">
          <div className="mb-4 flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/games">
                <ArrowLeft className="mr-1 h-4 w-4" /> Games
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <span className="rounded-sm bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                FREE PLAY
              </span>
              <h1 className="font-arcade text-xs text-foreground md:text-sm">{game.title}</h1>
            </div>
          </div>

          {/* Game container + keymap */}
          <div className="mx-auto flex max-w-5xl items-start gap-3">
            <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-border/50 bg-card">
              <GamePlayer
                romPath={game.rom_path ?? config?.rom ?? game.slug}
                core={game.core ?? config?.core ?? "mame2003_plus"}
                title={game.title}
                bios={config?.bios}
              />
            </div>
            <div className="hidden shrink-0 lg:block">
              <KeymapOverlay
                gameSlug={game.slug}
                core={game.core ?? config?.core ?? "mame2003_plus"}
                dbKeymapping={(game as any).keymapping as DbKeymapping | null}
              />
            </div>
          </div>

          {/* Input method recommendation */}
          {config?.inputMethod && (
            <div className="mx-auto mt-3 max-w-4xl">
              <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 text-xs text-muted-foreground">
                {config.inputMethod === 'controller' ? (
                  <><Gamepad2 className="h-3 w-3 text-primary" /> Best played with a USB/Bluetooth controller</>
                ) : (
                  <><Keyboard className="h-3 w-3 text-primary" /> Keyboard recommended</>
                )}
              </Badge>
            </div>
          )}

          {/* Game info */}
          <div className="mx-auto mt-6 max-w-4xl rounded-lg border border-border/50 bg-card p-4">
            <div className="flex items-start gap-4">
              {game.thumbnail_path && (
                <img
                  src={`https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public/game-thumbnails/${game.thumbnail_path}`}
                  alt={game.title}
                  className="h-16 w-16 rounded object-cover border border-border/50 flex-shrink-0"
                />
              )}
              <div>
                <h2 className="font-arcade text-[10px] text-foreground">{game.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {config?.description ?? game.description ?? "Free Play Mode — no time limits, just fun!"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default FreePlay;
