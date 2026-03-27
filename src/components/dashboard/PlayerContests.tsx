import { useState, useCallback } from "react";
import { Trophy, Clock, Gamepad2, Play, Shield, ChevronDown, ChevronUp, DollarSign, Loader2, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Contest, GameSession, ContestGame, Game, ContestParticipant, ContestWinner } from "@/types/database";
import OnboardingTour, { type TourStep } from "@/components/OnboardingTour";

const STORAGE_BASE = "https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public";

const statusColors: Record<string, string> = {
  active: "bg-neon-green/20 text-neon-green border-neon-green/30",
  upcoming: "bg-primary/20 text-primary border-primary/30",
  closed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

const TOUR_STEPS: TourStep[] = [
  { targetSelector: '[data-tour="fc-contest-card"]', title: "Browse Contests", description: "Each card shows the entry fee, timer duration, and your best score. Find one that fits your style!", position: "right" },
  { targetSelector: '[data-tour="fc-join-btn"]', title: "Join & Compete!", description: "Click Join to enter — your wallet will be charged the entry fee. Then start playing to climb the ranks!", position: "left" },
];

interface PlayerContestsProps {
  contests: Contest[];
  sessions: GameSession[];
  winners?: ContestWinner[];
  profiles?: { user_id: string; display_name: string | null; username: string | null }[];
}

const PlayerContests = ({ contests, sessions, winners = [], profiles = [] }: PlayerContestsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedContest, setExpandedContest] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);

  const { data: participants = [] } = useQuery({
    queryKey: ["my-contest-participants", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("contest_participants").select("*").eq("user_id", user.id);
      return (data as unknown as ContestParticipant[]) ?? [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const { data: contestGames = [] } = useQuery({
    queryKey: ["contest-games-all"],
    queryFn: async () => {
      const { data } = await supabase.from("contest_games").select("*").eq("is_active", true).order("sort_order");
      return (data as unknown as ContestGame[]) ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: games = [] } = useQuery({
    queryKey: ["games-active-all"],
    queryFn: async () => {
      const { data } = await supabase.from("games").select("*").eq("is_active", true).order("title");
      return (data as unknown as Game[]) ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const joinedContestIds = participants.map(p => p.contest_id);
  const isJoined = (contestId: string) => joinedContestIds.includes(contestId);

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
      await queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
      setExpandedContest(contestId);
    }
  }, [user, queryClient]);

  if (contests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-card py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-neon-pink/10">
          <Trophy className="h-8 w-8 text-neon-pink/50" />
        </div>
        <p className="font-arcade text-[11px] text-muted-foreground mb-1">No Contests Available</p>
        <p className="text-xs text-muted-foreground/70 max-w-xs">New contests are coming soon — check back later!</p>
      </div>
    );
  }

  const getName = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p?.display_name || p?.username || uid.slice(0, 8);
  };

  // Track first join button for tour
  let joinBtnTagged = false;

  return (
    <div className="space-y-4">
      {contests.map((contest, i) => {
        const joined = isJoined(contest.id);
        const mySessions = sessions.filter(s => s.contest_id === contest.id);
        const bestScore = mySessions.length > 0 ? Math.max(...mySessions.map(s => s.score ?? 0)) : 0;
        const cGames = getContestGames(contest.id);
        const isExpanded = expandedContest === contest.id;
        const winner = winners.find(w => w.contest_id === contest.id);
        const isMyWin = winner?.user_id === user?.id;

        const showJoinBtn = !joined && contest.status !== "closed";
        const tagJoin = showJoinBtn && !joinBtnTagged;
        if (tagJoin) joinBtnTagged = true;

        return (
          <div
            key={contest.id}
            className={cn(
              "rounded-lg border border-border/50 bg-card overflow-hidden transition-all hover:neon-border",
              isMyWin && "border-neon-pink/30"
            )}
            {...(i === 0 ? { "data-tour": "fc-contest-card" } : {})}
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <h3 className="font-arcade text-[10px] leading-relaxed text-foreground">{contest.title}</h3>
                    <Badge variant="outline" className={statusColors[contest.status]}>{contest.status}</Badge>
                    {joined && (
                      <Badge variant="outline" className="border-neon-green/30 text-neon-green text-[10px]">✓ Joined</Badge>
                    )}
                    {isMyWin && (
                      <Badge variant="outline" className="border-neon-pink/30 text-neon-pink text-[10px] gap-0.5">
                        <Crown className="h-2.5 w-2.5" /> Winner!
                      </Badge>
                    )}
                  </div>
                  {contest.description && <p className="mb-3 text-xs text-muted-foreground">{contest.description}</p>}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-neon-pink" /> Best: {bestScore.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Gamepad2 className="h-3 w-3 text-primary" /> {mySessions.length} sessions</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {contest.session_duration_seconds / 60}min</span>
                    <span>Fee: ${(contest.session_fee_cents / 100).toFixed(2)}</span>
                  </div>
                  {winner && contest.status === "closed" && (
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <Crown className={`h-3 w-3 ${isMyWin ? "text-neon-pink" : "text-muted-foreground"}`} />
                      <span className={isMyWin ? "text-neon-pink font-medium" : "text-muted-foreground"}>
                        {isMyWin ? `You won! Payout: $${(winner.payout_cents / 100).toFixed(2)}` : `Winner: ${getName(winner.user_id)} — ${winner.winning_score.toLocaleString()} pts`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-3 shrink-0">
                  {contest.status === "closed" ? (
                    <Badge variant="outline" className="text-muted-foreground">Closed</Badge>
                  ) : joined ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-neon-green/30 text-neon-green hover:bg-neon-green/10 text-xs gap-1"
                      onClick={() => setExpandedContest(isExpanded ? null : contest.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {cGames.length > 0 ? `${cGames.length} Games` : "Joined"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-accent text-accent-foreground hover:bg-accent/80 text-xs"
                      onClick={() => handleJoin(contest.id)}
                      disabled={joining === contest.id}
                      {...(tagJoin ? { "data-tour": "fc-join-btn" } : {})}
                    >
                      {joining === contest.id ? "Joining..." : "Join Contest"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {joined && isExpanded && (
              <div className="border-t border-border/30 p-4 bg-secondary/10">
                {cGames.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No games assigned to this contest yet.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {cGames.map((game) => (
                      <div key={game.id} className="flex items-center gap-3 rounded-lg border border-border/30 bg-card p-3 hover:border-neon-pink/30 transition-colors">
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
                        <Button size="sm" className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/80 text-[10px] h-7 px-2 gap-1" asChild>
                          <Link to={`/contest-play/${contest.slug}/${game.slug}`}>
                            <Play className="h-3 w-3" /> Play
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {contests.length > 0 && (
        <OnboardingTour steps={TOUR_STEPS} storageKey="tour-player-find-contests" />
      )}
    </div>
  );
};

export default PlayerContests;
