import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import OnboardingTour, { type TourStep } from "@/components/OnboardingTour";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image as ImageIcon, Video } from "lucide-react";
import GameplayMediaViewer from "@/components/dashboard/GameplayMediaViewer";
import TablePagination, { usePagination } from "@/components/dashboard/TablePagination";
import { formatDateTime } from "@/lib/datetime";
import type { GameSession, Game, Contest, Profile } from "@/types/database";

interface AdminSessionsProps {
  sessions: GameSession[];
  games: Game[];
  contests: Contest[];
  profiles: Profile[];
}

const statusColors: Record<string, string> = {
  active: "border-neon-green/30 text-neon-green",
  ended: "border-muted-foreground/30 text-muted-foreground",
  flagged: "border-destructive/30 text-destructive",
};

const ADMIN_SESSION_TOUR: TourStep[] = [
  { targetSelector: '[data-tour="as-filters"]', title: "Filter Sessions", description: "Search by player, filter by contest, game, or status. Find exactly what you need!", position: "bottom" },
  { targetSelector: '[data-tour="as-table"]', title: "Session Table", description: "View scores, statuses, and media for every game session. Click media icons to review screenshots and recordings.", position: "top" },
];

const AdminSessions = ({ sessions, games, contests, profiles }: AdminSessionsProps) => {
  const [filterGame, setFilterGame] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterContest, setFilterContest] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaType, setMediaType] = useState<"screenshot" | "recording">("screenshot");
  const [mediaSession, setMediaSession] = useState<GameSession | null>(null);

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.display_name ?? uid.slice(0, 8);
  const getGame = (gid: string) => games.find(g => g.id === gid)?.title ?? "—";
  const getContest = (cid: string) => contests.find(c => c.id === cid)?.title ?? "—";

  const openMedia = (session: GameSession, type: "screenshot" | "recording") => {
    setMediaSession(session);
    setMediaType(type);
    setMediaOpen(true);
  };

  const filtered = sessions.filter(s => {
    if (filterGame !== "all" && s.game_id !== filterGame) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterContest !== "all" && s.contest_id !== filterContest) return false;
    if (search && !getName(s.user_id).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const { totalPages, totalItems, pageSize, getPage } = usePagination(filtered, 15);
  const paginatedSessions = getPage(page);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3" data-tour="as-filters">
        <Input
          placeholder="Search player..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs border-border bg-secondary/50 text-foreground"
        />
        <Select value={filterContest} onValueChange={handleFilterChange(setFilterContest)}>
          <SelectTrigger className="w-44 border-border bg-secondary/50 text-foreground">
            <SelectValue placeholder="Contest" />
          </SelectTrigger>
          <SelectContent className="border-border bg-card">
            <SelectItem value="all">All Contests</SelectItem>
            {contests.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterGame} onValueChange={handleFilterChange(setFilterGame)}>
          <SelectTrigger className="w-40 border-border bg-secondary/50 text-foreground">
            <SelectValue placeholder="Game" />
          </SelectTrigger>
          <SelectContent className="border-border bg-card">
            <SelectItem value="all">All Games</SelectItem>
            {games.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={handleFilterChange(setFilterStatus)}>
          <SelectTrigger className="w-36 border-border bg-secondary/50 text-foreground">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-border bg-card">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/50 bg-card overflow-hidden" data-tour="as-table">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Player</th>
              <th className="px-4 py-3 text-left font-medium">Game</th>
              <th className="px-4 py-3 text-left font-medium">Contest</th>
              <th className="px-4 py-3 text-right font-medium">Score</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Media</th>
              <th className="px-4 py-3 text-right font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSessions.map(s => (
              <tr key={s.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3 text-sm text-foreground">{getName(s.user_id)}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{getGame(s.game_id)}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{getContest(s.contest_id)}</td>
                <td className="px-4 py-3 text-right text-sm text-foreground font-mono">{s.score?.toLocaleString() ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="outline" className={statusColors[s.status] ?? ""}>{s.status}</Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-6 w-6 p-0 ${s.screenshot_path ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}
                      title={s.screenshot_path ? "View screenshot" : "No screenshot"}
                      disabled={!s.screenshot_path}
                      onClick={() => openMedia(s, "screenshot")}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-6 w-6 p-0 ${s.recording_path ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}
                      title={s.recording_path ? "Watch recording" : "No recording"}
                      disabled={!s.recording_path}
                      onClick={() => openMedia(s, "recording")}
                    >
                      <Video className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                  {formatDateTime(s.started_at)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No sessions found.</td></tr>
            )}
          </tbody>
        </table>
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          pageSize={pageSize}
        />
      </div>

      <GameplayMediaViewer
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        type={mediaType}
        session={mediaSession}
        playerName={mediaSession ? getName(mediaSession.user_id) : undefined}
        gameTitle={mediaSession ? getGame(mediaSession.game_id) : undefined}
      />
      <OnboardingTour steps={ADMIN_SESSION_TOUR} storageKey="tour-admin-sessions" />
    </div>
  );
};

export default AdminSessions;
