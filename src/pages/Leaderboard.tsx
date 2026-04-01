import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { Trophy, Crown, Medal, Award, ChevronLeft, ChevronRight, Gamepad2, Search, X, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STORAGE_BASE = "https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public";
const PAGE_SIZE = 10;

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  best_score: number;
  contest_id: string;
  contest_title: string;
  game_id: string;
  game_title: string;
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

const LeaderboardSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: PAGE_SIZE }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-secondary/30">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    ))}
  </div>
);

const Leaderboard = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [contestFilter, setContestFilter] = useState<string>("all");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const t = setTimeout(() => {
      setDebouncedSearch(value.trim());
      setPage(1);
    }, 400);
    setSearchTimeout(t);
  };

  const clearFilters = () => {
    setContestFilter("all");
    setGameFilter("all");
    setSearchQuery("");
    setDebouncedSearch("");
    setPage(1);
  };

  const hasActiveFilters = contestFilter !== "all" || gameFilter !== "all" || debouncedSearch !== "";

  // Fetch contests for filter dropdown (public read)
  const { data: contests = [] } = useQuery({
    queryKey: ["leaderboard-contests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("id, title, status")
        .in("status", ["active", "closed"])
        .order("title");
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Fetch games for filter dropdown (public read)
  const { data: games = [] } = useQuery({
    queryKey: ["leaderboard-games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, title")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const rpcFilters = useMemo(() => ({
    _contest_id: contestFilter !== "all" ? contestFilter : undefined,
    _game_id: gameFilter !== "all" ? gameFilter : undefined,
    _search: debouncedSearch || undefined,
  }), [contestFilter, gameFilter, debouncedSearch]);

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["global-leaderboard-count", rpcFilters],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (rpcFilters._contest_id) params._contest_id = rpcFilters._contest_id;
      if (rpcFilters._game_id) params._game_id = rpcFilters._game_id;
      if (rpcFilters._search) params._search = rpcFilters._search;
      const { data, error } = await supabase.rpc("get_global_leaderboard_count", params);
      if (error) throw error;
      return Number(data) || 0;
    },
    staleTime: 30_000,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["global-leaderboard", page, rpcFilters],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        _limit: PAGE_SIZE,
        _offset: (page - 1) * PAGE_SIZE,
      };
      if (rpcFilters._contest_id) params._contest_id = rpcFilters._contest_id;
      if (rpcFilters._game_id) params._game_id = rpcFilters._game_id;
      if (rpcFilters._search) params._search = rpcFilters._search;
      const { data, error } = await supabase.rpc("get_global_leaderboard", params);
      if (error) throw error;
      return (data as LeaderboardEntry[]) || [];
    },
    staleTime: 30_000,
  });

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarUrl = (url: string | null) => {
    if (!url) return undefined;
    if (url.startsWith("http")) return url;
    return `${STORAGE_BASE}/avatars/${url}`;
  };

  const paginationRange = () => {
    const pages: (number | "ellipsis")[] = [];
    const addPage = (p: number) => { if (!pages.includes(p)) pages.push(p); };
    addPage(1);
    if (page > 3) pages.push("ellipsis");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) addPage(i);
    if (page < totalPages - 2) pages.push("ellipsis");
    if (totalPages > 1) addPage(totalPages);
    return pages;
  };

  return (
    <Layout>
      <PageMeta
        title="Leaderboard | ArcadeChamps"
        description="See the top players across all contests on ArcadeChamps. Compete for the highest scores and climb the ranks!"
      />

      <div className="min-h-screen  pb-24">
        {/* Hero header */}
        <div className=" bg-grid relative overflow-hidden mb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 py-10 text-center relative z-10">
            <div className="inline-flex items-center gap-3 mb-4">
        
            </div>
            <h1 className="font-arcade text-xl md:text-2xl text-foreground mb-2">
              View <span className="text-neon-pink text-glow-pink">Global</span> Leaderboard
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Top scores from all active and completed contests. Play more to climb the ranks!
            </p>
            {totalCount > 0 && (
              <Badge variant="outline" className="mt-4 border-primary/30 text-primary text-xs">
                {totalCount.toLocaleString()} {hasActiveFilters ? "matching" : "total"} entries
              </Badge>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-3xl">
          {/* Filters */}
          <div className="mb-6 space-y-3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by player name..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-9 bg-card border-border/50"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setDebouncedSearch(""); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={contestFilter}
                onValueChange={(v) => { setContestFilter(v); setPage(1); }}
              >
                <SelectTrigger className="bg-card border-border/50 sm:flex-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="All Contests" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contests</SelectItem>
                  {contests.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={gameFilter}
                onValueChange={(v) => { setGameFilter(v); setPage(1); }}
              >
                <SelectTrigger className="bg-card border-border/50 sm:flex-1">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="All Games" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  {games.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground gap-1.5 self-center"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {/* Leaderboard list */}
          {isLoading ? (
            <LeaderboardSkeleton />
          ) : entries.length === 0 ? (
            <div className="text-center py-16">
              {hasActiveFilters ? (
                <>
                  <Filter className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-3">No results match your filters.</p>
                  <Button variant="outline" size="sm" onClick={clearFilters}>Clear all filters</Button>
                </>
              ) : (
                <>
                  <Gamepad2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground">No scores recorded yet. Be the first to play!</p>
                </>
              )}
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
                const isMe = entry.user_id === user?.id;
                const isTop3 = entry.rank <= 3;

                return (
                  <div
                    key={`${entry.user_id}-${entry.contest_id}-${entry.game_id}`}
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
                        <span className={cn(
                          "font-semibold truncate",
                          isTop3 ? "text-foreground" : "text-foreground/90"
                        )}>
                          {entry.display_name || entry.username || entry.user_id.slice(0, 8)}
                        </span>
                        {isMe && (
                          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary px-1.5 py-0">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground truncate">
                        <Gamepad2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{entry.game_title}</span>
                        <span className="text-border">•</span>
                        <span className="truncate">{entry.contest_title}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={cn(
                        "font-arcade text-sm tabular-nums",
                        isTop3 ? "text-primary" : "text-foreground/80"
                      )}>
                        {entry.best_score.toLocaleString()}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 px-2">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {paginationRange().map((item, idx) =>
                  item === "ellipsis" ? (
                    <span key={`e-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={item}
                      variant={item === page ? "default" : "ghost"}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setPage(item as number)}
                    >
                      {item}
                    </Button>
                  )
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;
