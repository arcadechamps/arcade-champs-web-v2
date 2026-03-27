import { useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { Trophy, Clock, Shield, Users, Loader2, DollarSign, Gamepad2, Play, ChevronDown, ChevronUp, Ban, Crown, Gift, Medal, Award } from "lucide-react";
import { useScrollReveal, staggerDelay } from "@/hooks/useScrollReveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Contest as ContestType, ContestParticipant, ContestGame, Game, ContestWinner, Profile } from "@/types/database";
import ContestTour from "@/components/ContestTour";
import ContestNotStartedDialog from "@/components/ContestNotStartedDialog";
import { withEffectiveStatus } from "@/utils/contestStatus";

const STORAGE_BASE = "https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public";

const statusColors: Record<string, string> = {
  active: "border-neon-green/30 text-neon-green",
  upcoming: "border-primary/30 text-primary",
  closed: "border-muted-foreground/30 text-muted-foreground",
};

function ContestCardWrapper({ index, tourProps, children }: { index: number; tourProps: Record<string, string>; children: React.ReactNode }) {
  const ref = useScrollReveal<HTMLDivElement>({ variant: "fade-up", delay: staggerDelay(index) });
  return (
    <div ref={ref} className="rounded-lg border border-border/50 bg-card transition-all hover:neon-border-pink overflow-hidden" {...tourProps}>
      {children}
    </div>
  );
}

type LeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  best_score: number;
};

function ContestLeaderboard({ contestId, currentUserId }: { contestId: string; currentUserId?: string }) {
  const [open, setOpen] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["contest-leaderboard", contestId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_contest_leaderboard", {
        _contest_id: contestId,
        _limit: 10,
      });
      if (error) throw error;
      return (data as unknown as LeaderboardEntry[]) ?? [];
    },
    enabled: open,
    staleTime: 30 * 1000,
  });

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-3.5 w-3.5 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-3.5 w-3.5 text-gray-300" />;
    if (rank === 3) return <Award className="h-3.5 w-3.5 text-amber-600" />;
    return <span className="text-[10px] text-muted-foreground font-mono w-3.5 text-center">#{rank}</span>;
  };

  return (
    <div className="border-t border-border/30">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-neon-pink" /> Leaderboard
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-3">No scores yet — be the first!</p>
          ) : (
            <div className="space-y-1">
              {entries.map((e) => {
                const isYou = currentUserId === e.user_id;
                const name = e.display_name || e.username || e.user_id.slice(0, 8);
                const initials = name.charAt(0).toUpperCase();
                return (
                  <div
                    key={e.user_id}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${isYou ? "bg-neon-pink/10 border border-neon-pink/20" : ""}`}
                  >
                    <div className="w-5 flex justify-center">{rankIcon(e.rank)}</div>
                    {e.avatar_url ? (
                      <img src={e.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                        {initials}
                      </div>
                    )}
                    <span className="flex-1 truncate text-foreground">
                      {name}
                      {isYou && <span className="ml-1 text-neon-pink text-[9px] font-medium">(You)</span>}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{e.best_score.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const Contest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joining, setJoining] = useState<string | null>(null);
  const [expandedContest, setExpandedContest] = useState<string | null>(null);
  const [contestDialog, setContestDialog] = useState<{ contestTitle: string; startsAt: string | null; endsAt: string | null; gameSlug: string; variant: "upcoming" | "closed" } | null>(null);
  const [banModal, setBanModal] = useState<{ contestTitle: string; banReason: string | null } | null>(null);
  const headerRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up" });

  const { data: contests = [], isLoading: loadingContests } = useQuery({
    queryKey: ["contests"],
    queryFn: async () => {
      const { data } = await supabase.from("contests").select("*").order("created_at", { ascending: false });
      return ((data as unknown as ContestType[]) ?? []).map(withEffectiveStatus);
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: participants = [], isLoading: loadingParticipants } = useQuery({
    queryKey: ["contest-participants", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("contest_participants").select("*").eq("user_id", user.id);
      return (data as unknown as ContestParticipant[]) ?? [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: contestGames = [] } = useQuery({
    queryKey: ["contest-games-public"],
    queryFn: async () => {
      const { data } = await supabase.from("contest_games").select("*").eq("is_active", true).order("sort_order");
      return (data as unknown as ContestGame[]) ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: games = [] } = useQuery({
    queryKey: ["games-active"],
    queryFn: async () => {
      const { data } = await supabase.from("games").select("*").eq("is_active", true).order("title");
      return (data as unknown as Game[]) ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: contestWinners = [] } = useQuery({
    queryKey: ["contest-winners-public"],
    queryFn: async () => {
      const { data } = await supabase.from("contest_winners").select("*");
      return (data as unknown as ContestWinner[]) ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: winnerProfiles = [] } = useQuery({
    queryKey: ["winner-profiles", contestWinners.map(w => w.user_id).join(",")],
    queryFn: async () => {
      const userIds = [...new Set(contestWinners.map(w => w.user_id))];
      if (userIds.length === 0) return [];
      const { data } = await supabase.rpc("get_display_names", { user_ids: userIds });
      return (data as unknown as Profile[]) ?? [];
    },
    enabled: contestWinners.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const getWinnerName = (uid: string) => {
    const p = winnerProfiles.find(p => p.user_id === uid);
    return p?.display_name || p?.username || uid.slice(0, 8);
  };

  const loading = loadingContests || loadingParticipants;

  const isJoined = (contestId: string) => participants.some(p => p.contest_id === contestId);

  const getBanStatus = (contestId: string): { isBanned: boolean; banReason: string | null } => {
    const p = participants.find(p => p.contest_id === contestId);
    if (!p) return { isBanned: false, banReason: null };
    return { isBanned: (p as any).is_banned ?? false, banReason: (p as any).ban_reason ?? null };
  };

  const handleJoin = async (contestId: string) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setJoining(contestId);
    const { error } = await supabase.from("contest_participants").insert({
      contest_id: contestId,
      user_id: user.id,
    });
    setJoining(null);
    if (error) toast.error("Failed to join: " + error.message);
    else {
      toast.success("You've joined the contest!");
      queryClient.invalidateQueries({ queryKey: ["contest-participants", user?.id] });
    }
  };

  const getContestGames = (contestId: string) => {
    const gameIds = contestGames.filter(cg => cg.contest_id === contestId).map(cg => cg.game_id);
    return games.filter(g => gameIds.includes(g.id));
  };

  const handlePlayContestGame = useCallback((contest: ContestType, gameSlug: string) => {
    if (!user) { navigate("/login"); return; }

    if (contest.status === "upcoming") {
      setContestDialog({ contestTitle: contest.title, startsAt: contest.starts_at, endsAt: contest.ends_at, gameSlug, variant: "upcoming" });
      return;
    }

    if (contest.status === "closed") {
      setContestDialog({ contestTitle: contest.title, startsAt: contest.starts_at, endsAt: contest.ends_at, gameSlug, variant: "closed" });
      return;
    }

    // Navigate to the play page — fee is deducted only when user clicks "Start Playing"
    navigate(`/contest-play/${contest.slug}/${gameSlug}`);
  }, [user, navigate]);

  const getTimeRemaining = (endsAt: string | null) => {
    if (!endsAt) return null;
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const generateContestSchema = () => {
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": contests.map((c, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Event",
          "name": c.title,
          "description": c.description || `Compete in ${c.title} and win prizes!`,
          "startDate": c.starts_at || new Date().toISOString(),
          "endDate": c.ends_at,
          "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
          "eventStatus": c.status === "active" ? "https://schema.org/EventRescheduled" : "https://schema.org/EventScheduled",
          "location": {
            "@type": "VirtualLocation",
            "url": `https://play.arcadechamps.com/contest`
          },
          "offers": {
            "@type": "Offer",
            "price": (c.session_fee_cents / 100).toFixed(2),
            "priceCurrency": "USD",
            "availability": c.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "url": `https://play.arcadechamps.com/contest`
          }
        }
      }))
    };
  };

  return (
    <Layout>
      <PageMeta 
        title="Active Contests" 
        description="Enter skill-based retro gaming contests, compete on the leaderboard, and win real prizes."
        schema={contests.length > 0 ? generateContestSchema() : undefined}
        canonicalUrl="/contest"
      />
      <section className="bg-grid py-16">
        <div className="container">
          <div ref={headerRef} className="mb-10 text-center">
            <h1 className="mb-4 font-arcade text-xl text-foreground md:text-2xl">
              Active <span className="text-neon-pink text-glow-pink">Contests</span>
            </h1>
            <p className="text-muted-foreground">Enter skill-based contests and compete for prizes. Login required.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : contests.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">No contests available right now. Check back soon!</p>
          ) : (
            <div className={`data-tour-contest-list gap-6 ${contests.length >= 3 ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : contests.length === 2 ? 'grid grid-cols-1 md:grid-cols-2' : 'space-y-6'}`} data-tour="contest-list">
              {contests.map((c, idx) => {
                const joined = isJoined(c.id);
                const { isBanned, banReason } = getBanStatus(c.id);
                const timeLeft = getTimeRemaining(c.ends_at);
                const cGames = getContestGames(c.id);
                const isExpanded = expandedContest === c.id;
                const winner = contestWinners.find(w => w.contest_id === c.id);

                return (
                  <ContestCardWrapper key={c.id} index={idx} tourProps={idx === 0 ? { "data-tour": "contest-card" } : {}}>
                    <div className="p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <Trophy className="h-6 w-6 text-neon-pink" />
                        <div className="flex items-center gap-2">
                          {joined && !isBanned && (
                            <Badge variant="outline" className="border-neon-green/30 text-neon-green text-[10px]">✓ Participating</Badge>
                          )}
                          {isBanned && (
                            <Badge variant="outline" className="border-destructive/50 bg-destructive/10 text-destructive text-[10px] flex items-center gap-1">
                              <Ban className="h-3 w-3" /> Banned
                            </Badge>
                          )}
                          <Badge variant="outline" className={statusColors[c.status] ?? ""}>
                            {c.status}
                          </Badge>
                        </div>
                      </div>
                      <h3 className="mb-1 font-arcade text-[10px] leading-relaxed text-foreground">{c.title}</h3>
                      {c.prize_cents > 0 && (
                        <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-neon-green/10 border border-neon-green/30 px-2.5 py-1">
                          <Gift className="h-3.5 w-3.5 text-neon-green" />
                          <span className="font-arcade text-[10px] text-neon-green">${(c.prize_cents / 100).toLocaleString()} Prize</span>
                        </div>
                      )}
                      {(c as any).prize_image_path && (
                        <div className="mb-3 rounded-lg border border-border/30 overflow-hidden bg-secondary/20">
                          <img
                            src={`${STORAGE_BASE}/game-thumbnails/${(c as any).prize_image_path}`}
                            alt={`${c.title} prize`}
                            className="w-full max-h-40 object-contain"
                            loading="lazy"
                          />
                        </div>
                      )}
                      {c.description && <p className="mb-4 text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                      <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-neon-green" /> ${(c.session_fee_cents / 100).toFixed(2)} fee
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {c.session_duration_seconds / 60}min
                        </span>
                        {timeLeft && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-neon-pink" /> {timeLeft}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Anti-Cheat
                        </span>
                        {cGames.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Gamepad2 className="h-3 w-3 text-primary" /> {cGames.length} games
                          </span>
                        )}
                      </div>

                      {/* Winner display for closed contests */}
                      {winner && c.status === "closed" && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-neon-pink/5 border border-neon-pink/20 px-3 py-2">
                          <Crown className="h-4 w-4 text-neon-pink" />
                          <span className="text-xs text-neon-pink font-medium">
                            Winner: {getWinnerName(winner.user_id)} — {winner.winning_score.toLocaleString()} pts
                            {winner.payout_cents > 0 && ` — $${(winner.payout_cents / 100).toFixed(2)} payout`}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {c.status === "closed" ? (
                          <Button disabled className="flex-1 text-xs" variant="outline">
                            Contest Closed
                          </Button>
                        ) : joined ? (
                          <Button
                            className="flex-1 bg-neon-green/20 text-neon-green border border-neon-green/30 text-xs"
                            onClick={() => setExpandedContest(isExpanded ? null : c.id)}
                            data-tour="contest-games"
                          >
                            {isExpanded ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
                            {cGames.length > 0 ? "View Games" : "Joined"}
                          </Button>
                        ) : (
                          <Button
                            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/80 neon-border-pink text-xs"
                            onClick={() => handleJoin(c.id)}
                            disabled={joining === c.id}
                            data-tour="contest-join"
                          >
                            {joining === c.id ? "Joining..." : "Enter Contest"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded game list for joined contests */}
                    {joined && isExpanded && (
                      <div className="border-t border-border/30 bg-secondary/10 p-4">
                        {cGames.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-3">No games assigned to this contest yet.</p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground mb-3">Contest Games — Click to play</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {cGames.map((game) => (
                                <button
                                  key={game.id}
                                  onClick={() => {
                                    if (isBanned) {
                                      setBanModal({ contestTitle: c.title, banReason });
                                      return;
                                    }
                                    handlePlayContestGame(c, game.slug);
                                  }}
                                  className={`flex items-center gap-3 rounded-lg border p-3 transition-all group text-left w-full ${
                                    isBanned
                                      ? "border-destructive/20 bg-destructive/5 opacity-60 cursor-not-allowed"
                                      : "border-border/30 bg-card hover:border-neon-pink/40 hover:bg-secondary/20"
                                  }`}
                                >
                                  <div className="h-10 w-10 shrink-0 rounded overflow-hidden bg-secondary/50 flex items-center justify-center relative">
                                    {game.thumbnail_path ? (
                                      <img src={`${STORAGE_BASE}/game-thumbnails/${game.thumbnail_path}`} alt={game.title} className="h-full w-full object-cover" />
                                    ) : (
                                      <Gamepad2 className="h-5 w-5 text-primary/30" />
                                    )}
                                    {isBanned && (
                                      <div className="absolute inset-0 bg-destructive/40 flex items-center justify-center rounded">
                                        <Ban className="h-4 w-4 text-white" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-arcade text-[9px] text-foreground truncate">{game.title}</p>
                                    <p className={`text-[10px] ${isBanned ? "text-destructive" : "text-muted-foreground"}`}>
                                      {isBanned ? "Access restricted" : "Contest Mode"}
                                    </p>
                                  </div>
                                  {isBanned
                                    ? <Ban className="h-4 w-4 text-destructive/60 shrink-0" />
                                    : <Play className="h-4 w-4 text-neon-pink opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Public leaderboard for active + closed contests */}
                    {(c.status === "active" || c.status === "closed") && (
                      <ContestLeaderboard contestId={c.id} currentUserId={user?.id} />
                    )}
                  </ContestCardWrapper>
                );
              })}
            </div>
          )}
        </div>
      </section>
      {!loadingContests && contests.length > 0 && <ContestTour />}

      {/* Ban info modal */}
      <Dialog open={!!banModal} onOpenChange={(open) => !open && setBanModal(null)}>
        <DialogContent className="max-w-sm border-destructive/30 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-arcade text-sm text-destructive">
              <Ban className="h-5 w-5" /> Access Restricted
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              You have been banned from <span className="font-semibold text-foreground">{banModal?.contestTitle}</span> and cannot play its games.
            </DialogDescription>
          </DialogHeader>
          {banModal?.banReason ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-destructive/70">Reason</p>
              <p className="text-foreground">{banModal.banReason}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No reason was provided by the admin.</p>
          )}
        </DialogContent>
      </Dialog>
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

export default Contest;
