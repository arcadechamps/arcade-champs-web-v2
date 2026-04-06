import { useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { Trophy, Clock, Shield, Users, Loader2, DollarSign, Gamepad2, Play, ChevronDown, ChevronUp, Ban, Crown, Gift, Medal, Award, Filter, ArrowDownUp } from "lucide-react";
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
// import ContestTour from "@/components/ContestTour";
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
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-slate-300" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
    return <span className="text-xs text-slate-400 font-mono w-4 text-center">#{rank}</span>;
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-1 text-sm font-medium text-slate-400 hover:text-white transition-colors underline underline-offset-4"
      >
        View Rankings
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-arcade text-lg text-foreground">
              <Trophy className="h-5 w-5 text-neon-pink" /> Leaderboard
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Top 10 current rankings for this contest.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No scores yet — be the first!</p>
            ) : (
              <div className="space-y-2">
                {entries.map((e) => {
                  const isYou = currentUserId === e.user_id;
                  const name = e.display_name || e.username || e.user_id.slice(0, 8);
                  const initials = name.charAt(0).toUpperCase();
                  return (
                    <div
                      key={e.user_id}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isYou ? "bg-neon-pink/10 border border-neon-pink/30" : "bg-secondary/20 hover:bg-secondary/30"}`}
                    >
                      <div className="w-6 flex justify-center">{rankIcon(e.rank)}</div>
                      {e.avatar_url ? (
                        <img src={e.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0 border border-border/50" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 border border-border/50">
                          {initials}
                        </div>
                      )}
                      <span className="flex-1 truncate font-medium text-foreground">
                        {name}
                        {isYou && <span className="ml-2 rounded-full bg-neon-pink/20 px-2 py-0.5 text-[10px] text-neon-pink font-bold uppercase tracking-wider">You</span>}
                      </span>
                      <span className="font-mono text-sm font-bold text-neon-green">{e.best_score.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
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
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEntry, setFilterEntry] = useState<string>("all");
  const [filterParticipating, setFilterParticipating] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
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

  let filteredContests = [...contests];
  if (filterStatus !== "all") {
    filteredContests = filteredContests.filter(c => c.status === filterStatus);
  }
  if (filterEntry === "free") {
    filteredContests = filteredContests.filter(c => c.session_fee_cents === 0);
  } else if (filterEntry === "paid") {
    filteredContests = filteredContests.filter(c => c.session_fee_cents > 0);
  }
  if (filterParticipating === "joined") {
    filteredContests = filteredContests.filter(c => isJoined(c.id));
  } else if (filterParticipating === "not-joined") {
    filteredContests = filteredContests.filter(c => !isJoined(c.id));
  }
  
  filteredContests.sort((a, b) => {
    if (sortBy === "fee-low") return a.session_fee_cents - b.session_fee_cents;
    if (sortBy === "fee-high") return b.session_fee_cents - a.session_fee_cents;
    if (sortBy === "games-high") return getContestGames(b.id).length - getContestGames(a.id).length;
    return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
  });

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
              Browse <span className="text-neon-pink text-glow-pink">Paid</span> Contests
            </h1>
            <p className="text-muted-foreground">Enter skill-based contests and compete for prizes. Login required.</p>
          </div>

          {!loading && contests.length > 0 && (
            <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 rounded-xl border border-white/5 bg-[#172033] p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 text-sm text-slate-400 font-medium mr-1">
                  <Filter className="h-4 w-4 text-neon-pink" /> Filters
                </div>
                <select
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-xs text-white outline-none focus:border-neon-pink hover:bg-[#202B45] transition-colors"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Now</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="closed">Closed / Past</option>
                </select>
                <select
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-xs text-white outline-none focus:border-neon-pink hover:bg-[#202B45] transition-colors"
                  value={filterParticipating}
                  onChange={(e) => setFilterParticipating(e.target.value)}
                >
                  <option value="all">All Participation</option>
                  <option value="joined">Joined Only</option>
                  <option value="not-joined">Not Joined</option>
                </select>
              </div>

              <div className="flex w-full md:w-auto items-center gap-3 justify-start md:justify-end">
                <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                  <ArrowDownUp className="h-4 w-4 text-primary" /> Sort
                </div>
                <select
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-xs text-white outline-none focus:border-neon-pink hover:bg-[#202B45] transition-colors"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="fee-low">Entry Fee: Low to High</option>
                  <option value="fee-high">Entry Fee: High to Low</option>
                  <option value="games-high">Most Games</option>
                </select>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : contests.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">No contests available right now. Check back soon!</p>
          ) : filteredContests.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-4 border border-white/5 rounded-xl bg-[#172033]">
              <Trophy className="h-12 w-12 text-slate-600/50 mb-1" />
              <p className="text-slate-400">No contests match your current filters.</p>
              <Button variant="outline" className="border-white/10 text-white" onClick={() => { setFilterStatus("all"); setFilterEntry("all"); setFilterParticipating("all"); }}>Clear Filters</Button>
            </div>
          ) : (
            <div className={`data-tour-contest-list gap-6 ${filteredContests.length >= 3 ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : filteredContests.length === 2 ? 'grid grid-cols-1 md:grid-cols-2' : 'space-y-6'}`} data-tour="contest-list">
              {filteredContests.map((c, idx) => {
                const joined = isJoined(c.id);
                const { isBanned, banReason } = getBanStatus(c.id);
                const timeLeft = getTimeRemaining(c.ends_at);
                const cGames = getContestGames(c.id);
                const isExpanded = expandedContest === c.id;
                const winner = contestWinners.find(w => w.contest_id === c.id);

                return (
                  <ContestCardWrapper key={c.id} index={idx} tourProps={idx === 0 ? { "data-tour": "contest-card" } : {}}>
                    <div className="relative h-48 w-full bg-[#0F172A] overflow-hidden">
                      {/* Image */}
                      {(c as any).prize_image_path ? (
                        <img
                          src={`${STORAGE_BASE}/game-thumbnails/${(c as any).prize_image_path}`}
                          alt={`${c.title} prize`}
                          className="w-full h-full object-cover opacity-80"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#1A233A] flex flex-col items-center justify-center relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-neon-pink/10" />
                          <div className="h-16 w-16 rounded-full bg-black/30 flex items-center justify-center mb-2 shadow-lg border border-white/5 relative z-10">
                            <Gift className="h-8 w-8 text-primary/60" />
                          </div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider relative z-10">Mystery Prize</span>
                        </div>
                      )}
                      
                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        {joined && !isBanned && (
                          <div className="flex items-center gap-1 rounded-full bg-[#00D06A] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                            <span className="text-white">✓</span> Participating
                          </div>
                        )}
                        {isBanned && (
                          <div className="flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                            <Ban className="h-3 w-3" /> Banned
                          </div>
                        )}
                        <div className={`rounded-full px-3 py-1 text-[11px] font-bold shadow-sm ${c.status === 'active' ? 'bg-blue-600 text-white' : c.status === 'closed' ? 'bg-[#FF3B30] text-white' : 'bg-primary text-primary-foreground'}`}>
                          {c.status}
                        </div>
                      </div>

                      {c.prize_cents > 0 && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-[#A322FF] px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                          <Gift className="h-3.5 w-3.5" />
                          <span>${(c.prize_cents / 100).toLocaleString()} Prize</span>
                        </div>
                      )}

                      {/* Winner display inset on the image for closed contests */}
                      {winner && c.status === "closed" && (
                        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 px-3 py-2">
                          <Crown className="h-4 w-4 text-yellow-400" />
                          <span className="text-xs text-white font-medium truncate">
                            Winner: {getWinnerName(winner.user_id)} — {winner.winning_score.toLocaleString()} pts
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex flex-col gap-5 bg-[#172033]">
                      {/* Title & Description */}
                      <div>
                        <h3 className="mb-2 text-xl font-bold text-white leading-tight capitalize">{c.title}</h3>
                        {(c as any).prize_description ? (
                          <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-neon-pink/10 px-2.5 py-1">
                            <Gift className="h-3.5 w-3.5 text-neon-pink" />
                            <span className="text-xs font-bold text-neon-pink">Win: {(c as any).prize_description}</span>
                          </div>
                        ) : c.prize_cents > 0 ? (
                          <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-neon-pink/10 px-2.5 py-1">
                            <Gift className="h-3.5 w-3.5 text-neon-pink" />
                            <span className="text-xs font-bold text-neon-pink">Win: ${(c.prize_cents / 100).toLocaleString()}</span>
                          </div>
                        ) : null}
                        
                        {c.description ? (
                          <p className="text-[13px] text-slate-300 line-clamp-2">{c.description}</p>
                        ) : (
                          <p className="text-[13px] text-slate-300">Compete for the top spot on the leaderboard.</p>
                        )}
                      </div>

                      {/* Info Boxes */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5 rounded-xl bg-[#202B45] p-3.5 border border-white/5">
                          <span className="text-xs text-slate-400 font-medium tracking-wide">Entry Fee</span>
                          <span className="text-sm font-semibold text-white">{(c.session_fee_cents === 0) ? "Free" : `$${(c.session_fee_cents / 100).toFixed(2)} fee`}</span>
                        </div>
                        <div className="flex flex-col gap-1.5 rounded-xl bg-[#202B45] p-3.5 border border-white/5">
                          <span className="text-xs text-slate-400 font-medium tracking-wide">Duration</span>
                          <span className="text-sm font-semibold text-white">{c.session_duration_seconds / 60}min</span>
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="flex flex-wrap items-center justify-between text-xs font-medium text-slate-400 mt-1">
                        {timeLeft ? (
                          <span className="flex items-center gap-1.5 text-[#FF3B30]">
                            <Clock className="h-4 w-4" /> {timeLeft}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[#FF3B30]">
                            <Clock className="h-4 w-4" /> Ended
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-[#00D06A]">
                          <Shield className="h-4 w-4" /> Anti-Cheat
                        </span>
                        {cGames.length > 0 && (
                          <span className="flex items-center gap-1.5 text-[#4A90E2]">
                            <Gamepad2 className="h-4 w-4" /> {cGames.length} games
                          </span>
                        )}
                      </div>

                      {/* Action Button & Loader */}
                      <div className="mt-2 space-y-3">
                        {c.status === "closed" ? (
                          <Button disabled className="w-full bg-[#202B45] hover:bg-[#202B45] text-slate-500 border-none font-semibold h-11 tracking-wide">
                            Contest Closed
                          </Button>
                        ) : joined ? (
                          <Button
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg font-bold h-11 transition-transform active:scale-[0.98]"
                            onClick={() => setExpandedContest(c.id)}
                            data-tour="contest-games"
                          >
                            Play Now
                          </Button>
                        ) : (
                          <Button
                            className="w-full bg-white text-black hover:bg-slate-200 font-bold h-11 transition-transform active:scale-[0.98]"
                            onClick={() => handleJoin(c.id)}
                            disabled={joining === c.id}
                            data-tour="contest-join"
                          >
                            {joining === c.id ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining...</>
                            ) : (
                              "Enter Contest"
                            )}
                          </Button>
                        )}
                        
                        {(c.status === "active" || c.status === "closed") && (
                          <ContestLeaderboard contestId={c.id} currentUserId={user?.id} />
                        )}
                      </div>
                    </div>
                  </ContestCardWrapper>
                );
              })}
            </div>
          )}
        </div>
      </section>
      {/* {!loadingContests && contests.length > 0 && <ContestTour /> */}

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
      {/* Game Selection Dialog for "Play Now" */}
      <Dialog open={!!expandedContest} onOpenChange={(open) => !open && setExpandedContest(null)}>
        <DialogContent className="sm:max-w-4xl bg-[#0F172A] border-[#202B45] p-0 overflow-hidden shadow-2xl">
          <div className="p-6 pb-5 border-b border-[#202B45]/50 bg-[#172033]/50">
            <DialogHeader>
              <DialogTitle className="font-arcade text-2xl text-foreground flex items-center gap-3">
                <Gamepad2 className="h-6 w-6 text-neon-pink" />
                Select Game
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm mt-1">
                Choose a game to play in this contest. Your highest score will decide your rank.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 bg-[#0F172A]">
            {!expandedContest ? null : getContestGames(expandedContest).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-[#202B45] rounded-xl bg-[#172033]/30">
                <Gamepad2 className="h-12 w-12 text-slate-600 mb-3" />
                <p className="text-lg font-medium text-slate-300">No Games Available</p>
                <p className="text-sm text-slate-500 mt-1">There are no games assigned to this contest yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 max-h-[60vh] overflow-y-auto pr-2 pb-2">
                {getContestGames(expandedContest).map(game => {
                  const contestInfo = contests.find(c => c.id === expandedContest);
                  const { isBanned, banReason } = getBanStatus(expandedContest);
                  
                  return (
                    <button
                      key={game.id}
                      onClick={() => {
                        if (!contestInfo) return;
                        if (isBanned) {
                          setExpandedContest(null);
                          setBanModal({ contestTitle: contestInfo.title, banReason });
                          return;
                        }
                        setExpandedContest(null);
                        handlePlayContestGame(contestInfo, game.slug);
                      }}
                      className={`group relative flex flex-col rounded-xl border transition-all duration-300 overflow-hidden text-left bg-[#172033] focus:outline-none focus:ring-2 focus:ring-neon-pink/50 ${
                        isBanned
                          ? "border-destructive/30 opacity-70 cursor-not-allowed"
                          : "border-[#202B45] hover:border-neon-pink/50 hover:shadow-[0_0_20px_rgba(255,42,133,0.15)] hover:-translate-y-1"
                      }`}
                    >
                      {/* Image / Header area */}
                      <div className="aspect-video w-full bg-[#0B1121] relative overflow-hidden shrink-0">
                        {game.thumbnail_path ? (
                          <img 
                            src={`${STORAGE_BASE}/game-thumbnails/${game.thumbnail_path}`} 
                            alt={game.title} 
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Gamepad2 className="h-10 w-10 text-slate-700/50" />
                          </div>
                        )}
                        
                        {/* Overlay bottom gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#172033] via-transparent to-transparent opacity-90" />
                        
                        {/* Play Action Overlay */}
                        {!isBanned && (
                          <div className="absolute inset-0 bg-[#0F172A]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                            <div className="h-14 w-14 rounded-full bg-neon-pink flex items-center justify-center shadow-[0_0_20px_rgba(255,42,133,0.6)] transform scale-75 group-hover:scale-100 transition-transform duration-300 delay-75">
                              <Play className="h-7 w-7 text-white ml-1" fill="currentColor" />
                            </div>
                          </div>
                        )}
                        
                        {/* Banned Overlay */}
                        {isBanned && (
                          <div className="absolute inset-0 bg-destructive/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                            <Ban className="h-8 w-8 text-white mb-2 shadow-sm" />
                            <span className="text-white font-bold text-sm tracking-wide uppercase">Restricted</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Content area */}
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-arcade text-sm text-foreground mb-3 line-clamp-1 group-hover:text-neon-pink transition-colors leading-relaxed" title={game.title}>{game.title}</h3>
                        <div className="mt-auto flex items-center justify-between">
                          <span className={`text-xs px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1.5 ${isBanned ? "bg-destructive/20 text-destructive" : "bg-[#202B45] text-slate-300"}`}>
                            {isBanned ? <Ban className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                            {isBanned ? "Banned" : "Contest Mode"}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
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
