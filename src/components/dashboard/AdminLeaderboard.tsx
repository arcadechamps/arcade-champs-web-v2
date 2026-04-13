import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Gamepad2, Search, X, ShieldAlert, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Contest, Game, AntiCheatLog, ContestWinner } from "@/types/database";

const STORAGE_BASE = "https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public";

interface AdminLeaderboardProps {
  contests: Contest[];
  games: Game[];
  logs: AntiCheatLog[];
  winners: ContestWinner[];
}

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

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
};

const getAvatarUrl = (url: string | null) => {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `${STORAGE_BASE}/avatars/${url}`;
};

const PAGE_SIZE = 25;

const AdminLeaderboard = ({ contests, games, logs, winners }: AdminLeaderboardProps) => {
  const [page, setPage] = useState(1);
  const [contestFilter, setContestFilter] = useState<string>("all");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const rpcFilters = useMemo(() => ({
    _contest_id: contestFilter !== "all" ? contestFilter : undefined,
    _game_id: gameFilter !== "all" ? gameFilter : undefined,
    _search: debouncedSearch || undefined,
  }), [contestFilter, gameFilter, debouncedSearch]);

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["admin-leaderboard-count", rpcFilters],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (rpcFilters._contest_id) params._contest_id = rpcFilters._contest_id;
      if (rpcFilters._game_id) params._game_id = rpcFilters._game_id;
      if (rpcFilters._search) params._search = rpcFilters._search;
      const { data, error } = await supabase.rpc("get_global_leaderboard_count", params);
      if (error) throw error;
      return Number(data) || 0;
    },
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["admin-leaderboard", page, rpcFilters],
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
  });

  const uniqueUserIds = useMemo(() => [...new Set(entries.map(e => e.user_id))], [entries]);

  const { data: emailsData = [] } = useQuery({
    queryKey: ["admin-leaderboard-emails", uniqueUserIds],
    queryFn: async () => {
      if (uniqueUserIds.length === 0) return [];
      const { data, error } = await supabase.rpc("get_user_emails", { user_ids: uniqueUserIds });
      if (error) throw error;
      return data || [];
    },
    enabled: uniqueUserIds.length > 0,
  });

  const emailMap = useMemo(() => {
    const map = new Map<string, string>();
    // Need to assert type matching supabase's returned array of { email, user_id }
    ;(emailsData as { email: string; user_id: string }[]).forEach(e => map.set(e.user_id, e.email));
    return map;
  }, [emailsData]);

  const getCheatCount = (userId: string) => logs.filter(l => l.user_id === userId).length;
  const getLastAmountWon = (userId: string) => {
    const userWins = winners.filter(w => w.user_id === userId).sort((a, b) => new Date(b.declared_at).getTime() - new Date(a.declared_at).getTime());
    if (userWins.length === 0) return null;
    return userWins[0].payout_cents;
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-arcade text-lg text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Global Leaderboard
          </CardTitle>
          <CardDescription>View global player scores with administrative details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
             <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by player name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 bg-secondary/50 border-border/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Select value={contestFilter} onValueChange={(v) => { setContestFilter(v); setPage(1); }}>
                <SelectTrigger className="bg-secondary/50 border-border/50 w-full sm:w-[200px]">
                  <SelectValue placeholder="All Contests" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contests</SelectItem>
                  {contests.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={gameFilter} onValueChange={(v) => { setGameFilter(v); setPage(1); }}>
                <SelectTrigger className="bg-secondary/50 border-border/50 w-full sm:w-[200px]">
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  {games.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>

          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-border/50 text-xs text-muted-foreground bg-secondary/20">
                    <th className="px-4 py-3 text-center font-medium w-16">Rank</th>
                    <th className="px-4 py-3 text-left font-medium">Player</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Contest & Game</th>
                    <th className="px-4 py-3 text-right font-medium">Score</th>
                    <th className="px-4 py-3 text-center font-medium">Cheat Flags</th>
                    <th className="px-4 py-3 text-right font-medium">Last Won</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                        Loading scores...
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        No scores found.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, idx) => {
                      const email = emailMap.get(entry.user_id) || "—";
                      const cheatCount = getCheatCount(entry.user_id);
                      const lastWon = getLastAmountWon(entry.user_id);

                      return (
                        <tr key={`${entry.user_id}-${entry.contest_id}-${entry.game_id}-${idx}`} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 text-center">
                            <span className="font-arcade text-muted-foreground text-xs">#{entry.rank}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 border border-border/50 shrink-0">
                                <AvatarImage src={getAvatarUrl(entry.avatar_url)} alt={entry.display_name || entry.username || "Player"} />
                                <AvatarFallback className="bg-secondary text-[10px] font-bold text-muted-foreground">
                                  {getInitials(entry.display_name || entry.username)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
                                {entry.display_name || entry.username || entry.user_id.slice(0, 8)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[180px]">
                            {email}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium text-foreground truncate max-w-[180px]">{entry.contest_title}</span>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Gamepad2 className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">{entry.game_title}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-arcade text-sm text-primary">{entry.best_score.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {cheatCount > 0 ? (
                              <Badge variant="destructive" className="h-6 gap-1 text-[10px] bg-destructive/20 text-destructive border-none">
                                <ShieldAlert className="h-3 w-3" /> {cheatCount}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {lastWon !== null ? (
                              <Badge variant="outline" className="border-neon-green/30 text-neon-green font-mono text-xs">
                                ${(lastWon / 100).toFixed(2)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border/50 bg-secondary/10">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} ({totalCount} total entries)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-secondary/50"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-secondary/50"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLeaderboard;
