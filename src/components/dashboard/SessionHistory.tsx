import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/datetime";
import TablePagination, { usePagination } from "@/components/dashboard/TablePagination";
import type { GameSession, Game, Contest } from "@/types/database";

interface SessionHistoryProps {
  sessions: GameSession[];
  games: Game[];
  contests: Contest[];
}

const SessionHistory = ({ sessions, games, contests }: SessionHistoryProps) => {
  const [page, setPage] = useState(1);
  const getGameTitle = (id: string) => games.find(g => g.id === id)?.title ?? "Unknown";
  const getContestTitle = (id: string) => contests.find(c => c.id === id)?.title ?? "Unknown";

  const { totalPages, totalItems, pageSize, getPage } = usePagination(sessions, 10);
  const paginatedSessions = getPage(page);

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Game</th>
              <th className="px-4 py-3 text-left font-medium">Contest</th>
              <th className="px-4 py-3 text-right font-medium">Score</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSessions.map((s) => (
              <tr key={s.id} className="border-b border-border/30 last:border-0 transition-colors hover:bg-secondary/30">
                <td className="px-4 py-3 text-sm text-foreground">{getGameTitle(s.game_id)}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{getContestTitle(s.contest_id)}</td>
                <td className="px-4 py-3 text-right font-arcade text-xs text-primary">{(s.score ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="outline" className={s.status === "ended" ? "border-neon-green/30 text-neon-green" : "border-primary/30 text-primary"}>
                    {s.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDateTime(s.started_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sessions.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No sessions yet.</p>
      )}
      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={pageSize}
      />
    </div>
  );
};

export default SessionHistory;
