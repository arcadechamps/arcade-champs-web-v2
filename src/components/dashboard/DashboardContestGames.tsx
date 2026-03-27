import { useState, useCallback } from "react";
import { Trophy, Gamepad2, Play, Clock, Shield, ChevronDown, ChevronUp, Loader2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Contest, Game, ContestGame, ContestParticipant } from "@/types/database";
import ContestNotStartedDialog from "@/components/ContestNotStartedDialog";
import { withEffectiveStatus } from "@/utils/contestStatus";
import OnboardingTour, { type TourStep } from "@/components/OnboardingTour";

const STORAGE_BASE = "https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public";

const statusColors: Record<string, string> = {
  active: "bg-neon-green/20 text-neon-green border-neon-green/30",
  upcoming: "bg-primary/20 text-primary border-primary/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const TOUR_STEPS: TourStep[] = [
  { targetSelector: '[data-tour="cg-contest-row"]', title: "Your Entered Contests", description: "Tap a contest to expand it and reveal the games inside. Each contest has its own set of games!", position: "bottom" },
  { targetSelector: '[data-tour="cg-play-btn"]', title: "Start a Contest Session", description: "Hit Play to launch a timed session. Your score counts toward the leaderboard — game on!", position: "left" },
];

const DashboardContestGames = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedContest, setExpandedContest] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [contestDialog, setContestDialog] = useState<{ contestTitle: string; startsAt: string | null; endsAt: string | null; gameSlug: string; variant: "upcoming" | "closed" } | null>(null);

  const { data: participants = [], isLoading: loadingParticipants } = useQuery({
    queryKey: ["my-contest-participants", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("contest_participants").select("*").eq("user_id", user.id);
      return (data as unknown as ContestParticipant[]) ?? [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const joinedContestIds = participants.map(p => p.contest_id);

  const { data: contests = [], isLoading: loadingContests } = useQuery({
    queryKey: ["contests-for-play"],
    queryFn: async () => {
      const { data } = await supabase.from("contests").select("*").in("status", ["active", "upcoming"]).order("created_at", { ascending: false });
      return ((data as unknown as Contest[]) ?? []).map(withEffectiveStatus);
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: contestGames = [], isLoading: loadingCG } = useQuery({
    queryKey: ["contest-games-all"],
    queryFn: async () => {
      const { data } = await supabase.from("contest_games").select("*").eq("is_active", true).order("sort_order");
      return (data as unknown as ContestGame[]) ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: games = [], isLoading: loadingGames } = useQuery({
    queryKey: ["games-active-all"],
    queryFn: async () => {
      const { data } = await supabase.from("games").select("*").eq("is_active", true).order("title");
      return (data as unknown as Game[]) ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const loading = loadingParticipants || loadingContests || loadingCG || loadingGames;

  const joinedContests = contests.filter(c => joinedContestIds.includes(c.id));
  const otherContests = contests.filter(c => !joinedContestIds.includes(c.id));

  const getContestGames = (contestId: string) => {
    const gameIds = contestGames.filter(cg => cg.contest_id === contestId).map(cg => cg.game_id);
    return games.filter(g => gameIds.includes(g.id));
  };

  const handleJoin = useCallback(async (contestId: string) => {
    if (!user) return;
    setJoining(contestId);
    const { error } = await supabase.from("contest_participants").insert({
      contest_id: contestId,
      user_id: user.id,
    });
    setJoining(null);
    if (error) {
      toast.error("Failed to join: " + error.message);
    } else {
      toast.success("You've joined the contest!");
      await queryClient.invalidateQueries({ queryKey: ["my-contest-participants", user.id] });
      setExpandedContest(contestId);
    }
  }, [user, queryClient]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Track if we found a play button for tour targeting
  let playBtnTagged = false;

  const renderGamesList = (contest: Contest) => {
    const cGames = getContestGames(contest.id);
    if (cGames.length === 0) {
      return <p className="text-xs text-muted-foreground text-center py-4">No games assigned to this contest yet.</p>;
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cGames.map((game, i) => {
          const tagPlay = !playBtnTagged && contest.status === "active";
          if (tagPlay) playBtnTagged = true;

          return (
            <div key={game.id} className="flex items-center gap-3 rounded-lg border border-border/30 bg-secondary/20 p-3 hover:border-neon-pink/30 transition-colors">
              <div className="h-12 w-12 shrink-0 rounded overflow-hidden bg-secondary/50 flex items-center justify-center">
                {game.thumbnail_path ? (
                  <img src={`${STORAGE_BASE}/game-thumbnails/${game.thumbnail_path}`} alt={game.title} className="h-full w-full object-cover" />
                ) : (
                  <Gamepad2 className="h-6 w-6 text-primary/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-arcade text-[9px] text-foreground truncate">{game.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="h-3 w-3 text-neon-green" />
                  <span className="text-[10px] text-muted-foreground">Anti-Cheat Active</span>
                </div>
              </div>
              {contest.status === "upcoming" ? (
                <Button size="sm" className="shrink-0 text-[10px] h-7 px-2 gap-1" variant="outline"
                  onClick={() => setContestDialog({ contestTitle: contest.title, startsAt: contest.starts_at, endsAt: contest.ends_at, gameSlug: game.slug, variant: "upcoming" })}
                >
                  <Play className="h-3 w-3" /> Play
                </Button>
              ) : contest.status === "closed" ? (
                <Button size="sm" className="shrink-0 text-[10px] h-7 px-2 gap-1" variant="outline"
                  onClick={() => setContestDialog({ contestTitle: contest.title, startsAt: contest.starts_at, endsAt: contest.ends_at, gameSlug: game.slug, variant: "closed" })}
                >
                  <Play className="h-3 w-3" /> Play
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/80 text-[10px] h-7 px-2 gap-1"
                  asChild
                  {...(tagPlay ? { "data-tour": "cg-play-btn" } : {})}
                >
                  <Link to={`/contest-play/${contest.slug}/${game.slug}`}>
                    <Play className="h-3 w-3" /> Play
                  </Link>
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-arcade text-xs text-foreground">Contest Games</h2>
        <p className="mt-1 text-xs text-muted-foreground">Play games in contests you've joined</p>
      </div>

      {joinedContests.length === 0 && otherContests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-card py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
            <Trophy className="h-8 w-8 text-primary/50" />
          </div>
          <p className="font-arcade text-[11px] text-muted-foreground mb-1">No Active Contests</p>
          <p className="text-xs text-muted-foreground/70 max-w-xs">Check back soon — new contests drop regularly!</p>
        </div>
      ) : joinedContests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-card py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-accent/10">
            <Gamepad2 className="h-8 w-8 text-accent/50" />
          </div>
          <p className="font-arcade text-[11px] text-muted-foreground mb-1">No Contests Joined Yet</p>
          <p className="text-xs text-muted-foreground/70 max-w-xs">Head to <span className="text-primary">Find Contests</span> to enter one and start playing!</p>
        </div>
      ) : null}

      {joinedContests.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Contests</p>
          {joinedContests.map((contest, i) => {
            const cGames = getContestGames(contest.id);
            const isExpanded = expandedContest === contest.id;

            return (
              <div
                key={contest.id}
                className="rounded-lg border border-border/50 bg-card overflow-hidden"
                {...(i === 0 ? { "data-tour": "cg-contest-row" } : {})}
              >
                <button
                  onClick={() => setExpandedContest(isExpanded ? null : contest.id)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Trophy className="h-5 w-5 text-neon-pink shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-arcade text-[10px] text-foreground">{contest.title}</span>
                        <Badge variant="outline" className={statusColors[contest.status] ?? ""}>{contest.status}</Badge>
                        <Badge variant="outline" className="border-neon-green/30 text-neon-green text-[10px]">✓ Joined</Badge>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {contest.session_duration_seconds / 60}min</span>
                        <span className="flex items-center gap-1"><Gamepad2 className="h-3 w-3" /> {cGames.length} games</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border/30 p-4">
                    {renderGamesList(contest)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {otherContests.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Available Contests</p>
          {otherContests.map((contest) => {
            const cGames = getContestGames(contest.id);
            const isExpanded = expandedContest === contest.id;

            return (
              <div key={contest.id} className="rounded-lg border border-border/50 bg-card overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-muted-foreground/50" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-arcade text-[10px] text-foreground">{contest.title}</span>
                        <Badge variant="outline" className={statusColors[contest.status] ?? ""}>{contest.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1 inline-flex"><DollarSign className="h-3 w-3" /> ${(contest.session_fee_cents / 100).toFixed(2)} fee</span>
                        <span className="mx-2">·</span>
                        {contest.session_duration_seconds / 60}min
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="border-accent text-accent hover:bg-accent/10 text-xs"
                    variant="outline"
                    onClick={() => handleJoin(contest.id)}
                    disabled={joining === contest.id}
                  >
                    {joining === contest.id ? "Joining..." : "Join Contest"}
                  </Button>
                </div>

                {isExpanded && joinedContestIds.includes(contest.id) && (
                  <div className="border-t border-border/30 p-4">
                    {renderGamesList(contest)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {joinedContests.length > 0 && (
        <OnboardingTour steps={TOUR_STEPS} storageKey="tour-player-contest-games" />
      )}

      <ContestNotStartedDialog
        open={!!contestDialog}
        onClose={() => setContestDialog(null)}
        contestTitle={contestDialog?.contestTitle ?? ""}
        startsAt={contestDialog?.startsAt ?? null}
        endsAt={contestDialog?.endsAt ?? null}
        gameSlug={contestDialog?.gameSlug ?? null}
        variant={contestDialog?.variant ?? "upcoming"}
      />
    </div>
  );
};

export default DashboardContestGames;
