import { useMemo } from "react";
import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { Trophy, Crown, Medal, Award, Gift, Clock, Gamepad2, Loader2, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { withEffectiveStatus } from "@/utils/contestStatus";
import type { Contest } from "@/types/database";

const STORAGE_BASE = "https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  best_score: number;
}

const RankDisplay = ({ rank }: { rank: number }) => {
  if (rank === 1)
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/40">
        <Crown className="h-5 w-5 text-yellow-400" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-300/15 border border-gray-300/30">
        <Medal className="h-5 w-5 text-gray-300" />
      </div>
    );
  if (rank === 3)
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-600/15 border border-amber-600/30">
        <Award className="h-5 w-5 text-amber-600" />
      </div>
    );
  return (
    <div className="flex items-center justify-center w-10 h-10">
      <span className="font-arcade text-sm text-muted-foreground">#{rank}</span>
    </div>
  );
};

const CardSkeleton = () => (
  <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
    <div className="p-6 space-y-3">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
    <div className="px-6 pb-6 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-secondary/30">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  </div>
);

const getTimeRemaining = (endsAt: string | null) => {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`;
};

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
};

const getAvatarUrl = (url: string | null) => {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `${STORAGE_BASE}/avatars/${url}`;
};

function ContestLeaderboardCard({
  contest,
  currentUserId,
}: {
  contest: Contest;
  currentUserId?: string;
}) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["live-leaderboard", contest.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_contest_leaderboard", {
        _contest_id: contest.id,
        _limit: 10,
      });
      if (error) throw error;
      return (data as unknown as LeaderboardEntry[]) ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const timeLeft = getTimeRemaining(contest.ends_at);

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden transition-all hover:neon-border-pink">
      {/* Contest header */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-5 w-5 text-neon-pink shrink-0" />
              <h2 className="font-arcade text-[10px] leading-relaxed text-foreground truncate">
                {contest.title}
              </h2>
            </div>
            {contest.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 ml-7">
                {contest.description}
              </p>
            )}
          </div>
          <Badge variant="outline" className="border-neon-green/30 text-neon-green text-[10px] shrink-0">
            <Zap className="h-3 w-3 mr-1" /> Live
          </Badge>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {contest.prize_cents > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-neon-green/10 border border-neon-green/30 px-2.5 py-1">
              <Gift className="h-3.5 w-3.5 text-neon-green" />
              <span className="font-arcade text-[10px] text-neon-green">
                ${(contest.prize_cents / 100).toLocaleString()} Prize
              </span>
            </span>
          )}
          {timeLeft && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1">
              <Clock className="h-3 w-3 text-neon-pink" /> {timeLeft}
            </span>
          )}
        </div>

        {(contest as any).prize_image_path && (
          <div className="mt-3 rounded-lg border border-border/30 overflow-hidden bg-secondary/20">
            <img
              src={`${STORAGE_BASE}/game-thumbnails/${(contest as any).prize_image_path}`}
              alt={`${contest.title} prize`}
              className="w-full max-h-32 object-contain"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="border-t border-border/30 px-6 pb-6 pt-4">
        <div className="flex items-center gap-1.5 mb-4">
          <Trophy className="h-3.5 w-3.5 text-neon-pink" />
          <span className="text-xs font-medium text-muted-foreground">Top 10 Leaderboard</span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-secondary/30">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <Gamepad2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">No scores yet — be the first to play!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Column labels */}
            <div className="hidden sm:grid grid-cols-[56px_1fr_auto] items-center gap-4 px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
              <span>Rank</span>
              <span>Player</span>
              <span className="text-right">Score</span>
            </div>

            {entries.map((entry) => {
              const isMe = entry.user_id === currentUserId;
              const isTop3 = entry.rank <= 3;

              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    "flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-lg border transition-all",
                    isTop3
                      ? "bg-card border-primary/20 shadow-lg shadow-primary/5"
                      : "bg-card/60 border-border/30 hover:bg-card hover:border-border/50",
                    isMe && "ring-1 ring-primary/40 bg-primary/5"
                  )}
                >
                  <RankDisplay rank={entry.rank} />

                  <Avatar className="h-10 w-10 border-2 border-border/50">
                    <AvatarImage src={getAvatarUrl(entry.avatar_url)} />
                    <AvatarFallback className="bg-secondary text-xs font-bold">
                      {getInitials(entry.display_name || entry.username)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "font-semibold truncate",
                          isTop3 ? "text-foreground" : "text-foreground/90"
                        )}
                      >
                        {entry.display_name || entry.username || entry.user_id.slice(0, 8)}
                      </span>
                      {isMe && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary/40 text-primary px-1.5 py-0"
                        >
                          You
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        "font-arcade text-sm tabular-nums",
                        isTop3 ? "text-primary" : "text-foreground/80"
                      )}
                    >
                      {entry.best_score.toLocaleString()}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const LiveLeaderboards = () => {
  const { user } = useAuth();

  const { data: rawContests = [], isLoading } = useQuery({
    queryKey: ["live-active-contests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as unknown as Contest[]) ?? []).map(withEffectiveStatus);
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const activeContests = useMemo(
    () => rawContests.filter((c) => c.status === "active"),
    [rawContests]
  );

  return (
    <Layout>
      <PageMeta
        title="Live Scores | ArcadeChamps"
        description="See the top 10 live scores for every active contest on ArcadeChamps. Watch the leaderboard update in real time!"
      />

      <div className="min-h-screen pb-24">
        {/* Hero header */}
        <div className="relative overflow-hidden mb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 py-10 text-center relative z-10">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
                <Zap className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="font-arcade text-xl md:text-2xl text-foreground mb-2">
              Live Scores
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Real-time top 10 leaderboards for every active contest. Scores refresh automatically.
            </p>
            {activeContests.length > 0 && (
              <Badge variant="outline" className="mt-4 border-primary/30 text-primary text-xs">
                {activeContests.length} active contest{activeContests.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-3xl">
          {isLoading ? (
            <div className="space-y-6">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : activeContests.length === 0 ? (
            <div className="text-center py-16">
              <Gamepad2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="font-arcade text-[11px] text-muted-foreground mb-1">
                No Active Contests
              </p>
              <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto">
                There are no contests running right now. Check back soon or visit the{" "}
                <a href="/contest" className="text-primary hover:underline">
                  Contests
                </a>{" "}
                page for upcoming events.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeContests.map((contest) => (
                <ContestLeaderboardCard
                  key={contest.id}
                  contest={contest}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default LiveLeaderboards;
