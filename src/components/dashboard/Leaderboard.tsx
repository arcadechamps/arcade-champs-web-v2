import { useMemo, useState } from "react";
import { Trophy, Medal, Crown, Star, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import TablePagination, { usePagination } from "@/components/dashboard/TablePagination";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { GameSession, Contest, Game, Profile, ContestWinner } from "@/types/database";

interface LeaderboardProps {
  sessions: GameSession[];
  contests: Contest[];
  games: Game[];
  profiles: Profile[];
  winners?: ContestWinner[];
}

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Crown className="h-4 w-4 text-neon-pink" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-neon-pink" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-neon-pink" />;
  return <span className="font-arcade text-xs text-muted-foreground w-4 text-center">#{rank}</span>;
};

const Leaderboard = ({ sessions, contests, games, profiles, winners = [] }: LeaderboardProps) => {
  const { user } = useAuth();
  const [selectedContestId, setSelectedContestId] = useState<string>("overall");
  const [selectedGameId, setSelectedGameId] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const getName = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p?.display_name || p?.username || uid.slice(0, 8);
  };
  const getGameTitle = (gameId: string) => games.find(g => g.id === gameId)?.title ?? "Unknown";

  const bestScores = useMemo(() => {
    const map: Record<string, { user_id: string; contest_id: string; game_id: string; score: number }> = {};
    for (const s of sessions) {
      if (s.score == null || s.score <= 0) continue;
      // Filter by game if a specific game is selected
      if (selectedGameId !== "all" && s.game_id !== selectedGameId) continue;

      const key = `${s.user_id}-${s.contest_id}`;
      if (!map[key] || s.score > map[key].score) {
        map[key] = { user_id: s.user_id, contest_id: s.contest_id, game_id: s.game_id, score: s.score };
      }
    }
    return Object.values(map);
  }, [sessions, selectedGameId]);

  const currentRanking = useMemo(() => {
    if (selectedContestId === "overall") {
      const totals: Record<string, { total: number; bestGame: string; bestScore: number }> = {};
      for (const b of bestScores) {
        if (!totals[b.user_id]) {
          totals[b.user_id] = { total: 0, bestGame: b.game_id, bestScore: b.score };
        }
        totals[b.user_id].total += b.score;
        if (b.score > totals[b.user_id].bestScore) {
          totals[b.user_id].bestGame = b.game_id;
          totals[b.user_id].bestScore = b.score;
        }
      }
      return Object.entries(totals)
        .map(([user_id, data]) => ({ user_id, score: data.total, game_id: data.bestGame }))
        .sort((a, b) => b.score - a.score);
    } else {
      return bestScores
        .filter(b => b.contest_id === selectedContestId)
        .sort((a, b) => b.score - a.score)
        .map(b => ({ user_id: b.user_id, score: b.score, game_id: b.game_id }));
    }
  }, [bestScores, selectedContestId]);

  const activeContests = contests.filter(c => c.status === "active" || c.status === "closed");

  const isContestWinner = (userId: string, contestId?: string) => {
    if (contestId) return winners.some(w => w.user_id === userId && w.contest_id === contestId);
    return winners.some(w => w.user_id === userId);
  };

  const { totalPages, totalItems, pageSize, getPage } = usePagination(currentRanking, 10);
  const pageRows = getPage(currentPage);
  const rankOffset = (currentPage - 1) * pageSize;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h2 className="font-arcade text-xs text-foreground">Leaderboards</h2>
      </div>

      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 rounded-xl border border-white/5 bg-[#172033] p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-slate-400 font-medium mr-1">
            <Filter className="h-4 w-4 text-neon-pink" /> Filters
          </div>

          <select
            className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-xs text-white outline-none focus:border-neon-pink hover:bg-[#202B45] transition-colors"
            value={selectedContestId}
            onChange={(e) => { setSelectedContestId(e.target.value); setCurrentPage(1); }}
          >
            <option value="overall">Global / Overall</option>
            {activeContests.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          <select
            className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-xs text-white outline-none focus:border-neon-pink hover:bg-[#202B45] transition-colors"
            value={selectedGameId}
            onChange={(e) => { setSelectedGameId(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">All Games</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-border/50 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Game</TableHead>
              <TableHead className="text-right">Score</TableHead>
              {selectedContestId !== "overall" && contests.find(c => c.id === selectedContestId)?.status === "active" && (
                <TableHead className="text-right w-28">Action</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell 
                  colSpan={selectedContestId !== "overall" && contests.find(c => c.id === selectedContestId)?.status === "active" ? 5 : 4} 
                  className="text-center text-muted-foreground py-8"
                >
                  No scores yet
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((r, i) => {
              const rank = rankOffset + i + 1;
              const isMe = r.user_id === user?.id;
              const contestIdParam = selectedContestId === "overall" ? undefined : selectedContestId;
              const isWinner = isContestWinner(r.user_id, contestIdParam);
              const isContestActive = selectedContestId !== "overall" && contests.find(c => c.id === selectedContestId)?.status === "active";
              
              return (
                <TableRow key={r.user_id} className={cn(
                  "border-b border-border/30 transition-colors hover:bg-primary/5",
                  isMe && "bg-primary/10",
                  isWinner && "bg-neon-pink/5"
                )}>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-1">
                      <RankIcon rank={rank} />
                      {rank <= 3 && <span className="font-arcade text-xs text-neon-pink">#{rank}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 font-semibold">
                    <span className="flex items-center gap-1.5">
                      {getName(r.user_id)}
                      {isWinner && (
                        <Badge variant="outline" className="ml-1 text-[10px] border-neon-pink/30 text-neon-pink gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-neon-pink" /> Winner
                        </Badge>
                      )}
                      {isMe && <Badge variant="outline" className="ml-1 text-[10px] border-primary/30 text-primary">You</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 text-sm text-muted-foreground">{r.game_id ? getGameTitle(r.game_id) : "—"}</TableCell>
                  <TableCell className="py-4 text-right font-arcade text-xs text-primary">{r.score.toLocaleString()}</TableCell>
                  {isContestActive && (
                    <TableCell className="py-4 text-right">
                      <Button asChild size="sm" className="h-7 text-[10px] px-3 font-arcade bg-accent text-accent-foreground hover:bg-accent/80">
                        <Link to="/contest">Join Contest</Link>
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          pageSize={pageSize}
        />
      </div>
    </div>
  );
};

export default Leaderboard;
