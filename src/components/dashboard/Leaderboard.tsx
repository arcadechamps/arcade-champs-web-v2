import { useMemo, useState } from "react";
import { Trophy, Medal, Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import TablePagination, { usePagination } from "@/components/dashboard/TablePagination";
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
  const [overallPage, setOverallPage] = useState(1);
  const [contestPage, setContestPage] = useState(1);

  const getName = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p?.display_name || p?.username || uid.slice(0, 8);
  };
  const getGameTitle = (gameId: string) => games.find(g => g.id === gameId)?.title ?? "Unknown";

  const bestScores = useMemo(() => {
    const map: Record<string, { user_id: string; contest_id: string; game_id: string; score: number }> = {};
    for (const s of sessions) {
      if (s.score == null || s.score <= 0) continue;
      const key = `${s.user_id}-${s.contest_id}`;
      if (!map[key] || s.score > map[key].score) {
        map[key] = { user_id: s.user_id, contest_id: s.contest_id, game_id: s.game_id, score: s.score };
      }
    }
    return Object.values(map);
  }, [sessions]);

  const overallRanking = useMemo(() => {
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
      .map(([user_id, data]) => ({ user_id, total: data.total, game_id: data.bestGame }))
      .sort((a, b) => b.total - a.total);
  }, [bestScores]);

  const contestRanking = useMemo(() => {
    if (selectedContestId === "overall") return [];
    return bestScores
      .filter(b => b.contest_id === selectedContestId)
      .sort((a, b) => b.score - a.score);
  }, [bestScores, selectedContestId]);

  const activeContests = contests.filter(c => c.status === "active" || c.status === "closed");

  const isContestWinner = (userId: string, contestId?: string) => {
    if (contestId) return winners.some(w => w.user_id === userId && w.contest_id === contestId);
    return winners.some(w => w.user_id === userId);
  };

  // Reset contest page when switching tabs
  const handleTabChange = (value: string) => {
    setSelectedContestId(value);
    setContestPage(1);
  };

  const renderTable = (
    rows: { user_id: string; score: number; game_id?: string }[],
    page: number,
    setPage: (p: number) => void,
    contestId?: string,
    startRankOffset = 0,
  ) => {
    const { totalPages, totalItems, pageSize, getPage } = usePagination(rows, 10);
    const pageRows = getPage(page);
    const rankOffset = (page - 1) * pageSize;

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Game</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No scores yet</TableCell></TableRow>
            )}
            {pageRows.map((r, i) => {
              const rank = rankOffset + i + 1;
              const isMe = r.user_id === user?.id;
              const isWinner = isContestWinner(r.user_id, contestId);
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          pageSize={pageSize}
        />
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h2 className="font-arcade text-xs text-foreground">Leaderboards</h2>
      </div>

      <Tabs value={selectedContestId} onValueChange={handleTabChange}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="overall">Overall</TabsTrigger>
          {activeContests.map(c => (
            <TabsTrigger key={c.id} value={c.id} className="max-w-[120px] truncate">{c.title}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overall" className="rounded-lg border border-border/50 bg-card">
          {renderTable(
            overallRanking.map(r => ({ user_id: r.user_id, score: r.total, game_id: r.game_id })),
            overallPage,
            setOverallPage,
          )}
        </TabsContent>

        {activeContests.map(c => (
          <TabsContent key={c.id} value={c.id} className="rounded-lg border border-border/50 bg-card">
            {renderTable(
              contestRanking.map(r => ({ user_id: r.user_id, score: r.score, game_id: r.game_id })),
              contestPage,
              setContestPage,
              c.id,
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Leaderboard;
