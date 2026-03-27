import { useState, useCallback } from "react";
import { Search, Gamepad2, Trophy, Play } from "lucide-react";
import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import GameCard from "@/components/GameCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { handleSupabaseError } from "@/lib/network-error-handler";
import type { Game, ContestGame, Contest as ContestType } from "@/types/database";
import { useScrollReveal, staggerDelay } from "@/hooks/useScrollReveal";
import ContestNotStartedDialog from "@/components/ContestNotStartedDialog";
import { withEffectiveStatus } from "@/utils/contestStatus";

type GameFilter = "all" | "free" | "contest";

function StaggeredGameCard({ game, index, playCounts, topPlayers, contestSlugMap, onContestClick }: {
  game: Game; index: number; playCounts: Record<string, number>; topPlayers: Record<string, string>;
  contestSlugMap: Record<string, string>; onContestClick: (slug: string, contestSlug: string) => void;
}) {
  const ref = useScrollReveal<HTMLDivElement>({ variant: "fade-up", delay: staggerDelay(index) });
  return (
    <div ref={ref}>
      <GameCard
        slug={game.slug}
        title={game.title}
        thumbnailPath={game.thumbnail_path}
        description={game.description}
        playCount={playCounts[game.id] || 0}
        topPlayer={topPlayers[game.id]}
        contestSlug={contestSlugMap[game.id]}
        onContestClick={() => contestSlugMap[game.id] && onContestClick(game.slug, contestSlugMap[game.id])}
      />
    </div>
  );
}

const Games = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GameFilter>("all");
  const [contestDialog, setContestDialog] = useState<{ contestTitle: string; startsAt: string | null; endsAt: string | null; gameSlug: string; variant: "upcoming" | "closed" } | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const headerRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up" });
  const filterRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up", delay: 100 });

  const { data: games = [], isLoading: loading } = useQuery({
    queryKey: ["games-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("games")
        .select("*")
        .eq("is_active", true)
        .order("title");
      return (data as unknown as Game[]) ?? [];
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: contestGames = [] } = useQuery({
    queryKey: ["contest-games-public"],
    queryFn: async () => {
      const { data } = await supabase.from("contest_games").select("*").eq("is_active", true);
      return (data as unknown as ContestGame[]) ?? [];
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: contests = [] } = useQuery({
    queryKey: ["contests-active-upcoming"],
    queryFn: async () => {
      const { data } = await supabase.from("contests").select("*").in("status", ["active", "upcoming"]);
      return ((data as unknown as ContestType[]) ?? []).map(withEffectiveStatus);
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: playCounts = {} } = useQuery({
    queryKey: ["game-play-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("game_sessions").select("game_id");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((s: any) => { counts[s.game_id] = (counts[s.game_id] || 0) + 1; });
      return counts;
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: topPlayers = {} } = useQuery({
    queryKey: ["game-top-players"],
    queryFn: async () => {
      const { data: scores } = await supabase
        .from("game_sessions")
        .select("game_id, score, user_id")
        .not("score", "is", null)
        .order("score", { ascending: false });

      const bestPerGame: Record<string, string> = {};
      const userIds = new Set<string>();
      (scores ?? []).forEach((s: any) => {
        if (!bestPerGame[s.game_id]) { bestPerGame[s.game_id] = s.user_id; userIds.add(s.user_id); }
      });

      if (userIds.size === 0) return {};
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, username").in("user_id", Array.from(userIds));
      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { nameMap[p.user_id] = p.display_name || p.username || "Anonymous"; });

      const result: Record<string, string> = {};
      Object.entries(bestPerGame).forEach(([gid, uid]) => { result[gid] = nameMap[uid] || "Anonymous"; });
      return result;
    },
    staleTime: 2 * 60 * 1000,
  });

  const contestGameIds = new Set(contestGames.map(cg => cg.game_id));

  // Build game_id -> contest slug map
  const contestSlugMap: Record<string, string> = {};
  const contestById: Record<string, ContestType> = {};
  contests.forEach(c => { contestById[c.id] = c; });
  contestGames.forEach(cg => {
    if (contestById[cg.contest_id] && !contestSlugMap[cg.game_id]) {
      contestSlugMap[cg.game_id] = contestById[cg.contest_id].slug;
    }
  });

  const filtered = games.filter((g) => {
    const matchesSearch = g.title.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "contest") return contestGameIds.has(g.id);
    return true;
  });

  const handleContestClick = useCallback(async (gameSlug: string, contestSlugVal: string) => {
    if (!user) { navigate("/login"); return; }
    const contest = Object.values(contestById).find(c => c.slug === contestSlugVal);
    if (!contest) { toast.error("Contest not found"); return; }

    if (contest.status === "upcoming") {
      setContestDialog({ contestTitle: contest.title, startsAt: contest.starts_at, endsAt: contest.ends_at, gameSlug, variant: "upcoming" });
      return;
    }

    if (contest.status === "closed") {
      setContestDialog({ contestTitle: contest.title, startsAt: contest.starts_at, endsAt: contest.ends_at, gameSlug, variant: "closed" });
      return;
    }

    const { data: existing } = await supabase
      .from("contest_participants").select("contest_id")
      .eq("contest_id", contest.id).eq("user_id", user.id).maybeSingle();

    if (!existing) {
      const { error } = await supabase.from("contest_participants").insert({ contest_id: contest.id, user_id: user.id });
      if (handleSupabaseError(error, "Contest", { onRetry: () => handleContestClick(gameSlug, contestSlugVal) })) return;
      toast.success("You've joined the contest!");
    }

    const { data: wallet } = await supabase.from("wallets").select("balance_cents").eq("user_id", user.id).maybeSingle();
    if ((wallet?.balance_cents ?? 0) < contest.session_fee_cents) {
      toast.error(`Insufficient balance. Need $${(contest.session_fee_cents / 100).toFixed(2)}`);
      return;
    }

    const { error: txError } = await supabase.from("wallet_transactions").insert({
      user_id: user.id, type: "session_fee" as const, amount_cents: contest.session_fee_cents,
      status: "succeeded" as const, contest_id: contest.id,
    });
    if (handleSupabaseError(txError, "Contest fee")) return;

    queryClient.invalidateQueries({ queryKey: ["wallet-balance", user.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success(`Fee deducted. Good luck!`);
    navigate(`/contest-play/${contestSlugVal}/${gameSlug}`);
  }, [user, contestById, navigate, queryClient]);

  const filterButtons: { key: GameFilter; label: string; icon: React.ElementType }[] = [
    { key: "all", label: "All Games", icon: Gamepad2 },
    { key: "free", label: "Free Play", icon: Play },
    { key: "contest", label: "Contest", icon: Trophy },
  ];

  return (
    <Layout>
      <PageMeta title="Browse Games" description="Browse our collection of classic retro games. Play for free or enter contests to win prizes." />
      <section className="bg-grid py-16">
        <div className="container">
          <div ref={headerRef} className="mb-10 text-center">
            <h1 className="mb-4 font-arcade text-xl text-foreground md:text-2xl">
              Browse <span className="text-primary text-glow-blue">Games</span>
            </h1>
            <p className="text-muted-foreground">Choose a game and start playing. Free play or enter a contest!</p>
          </div>

          <div ref={filterRef} className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search games..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex gap-1 rounded-lg border border-border bg-secondary/30 p-1">
              {filterButtons.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    filter === key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Gamepad2 className="h-8 w-8 animate-pulse text-primary" />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((game, i) => (
                <StaggeredGameCard key={game.id} game={game} index={i} playCounts={playCounts} topPlayers={topPlayers} contestSlugMap={contestSlugMap} onContestClick={handleContestClick} />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <p className="mt-10 text-center text-muted-foreground">No games found. Try a different search or filter.</p>
          )}
        </div>
      </section>
      <ContestNotStartedDialog
        open={!!contestDialog}
        onClose={() => setContestDialog(null)}
        contestTitle={contestDialog?.contestTitle ?? ""}
        startsAt={contestDialog?.startsAt ?? null}
        endsAt={contestDialog?.endsAt ?? null}
        gameSlug={contestDialog?.gameSlug ?? null}
        variant={contestDialog?.variant ?? "upcoming"}
      />
    </Layout>
  );
};

export default Games;
