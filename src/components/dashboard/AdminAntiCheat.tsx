import { useState } from "react";
import { ShieldAlert, CheckCircle, AlertTriangle, Eye } from "lucide-react";
import TablePagination, { usePagination } from "@/components/dashboard/TablePagination";
import OnboardingTour, { type TourStep } from "@/components/OnboardingTour";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleSupabaseError } from "@/lib/network-error-handler";
import InputReplayViewer, { type InputEvent } from "./InputReplayViewer";
import type { AntiCheatLog, Profile, Game, Contest } from "@/types/database";

interface AdminAntiCheatProps {
  logs: AntiCheatLog[];
  profiles: Profile[];
  games: Game[];
  contests: Contest[];
  onRefetch?: () => void;
}

const statusIcons = {
  clean: <CheckCircle className="h-3.5 w-3.5 text-neon-green" />,
  suspected: <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />,
  confirmed: <ShieldAlert className="h-3.5 w-3.5 text-destructive" />,
};

const statusColors = {
  clean: "border-neon-green/30 text-neon-green",
  suspected: "border-yellow-400/30 text-yellow-400",
  confirmed: "border-destructive/30 text-destructive",
};

const ADMIN_AC_TOUR: TourStep[] = [
  { targetSelector: '[data-tour="aac-table"]', title: "Anti-Cheat Logs", description: "All flagged gameplay sessions appear here with the player, game, contest, and reason for the flag.", position: "top" },
  { targetSelector: '[data-tour="aac-action"]', title: "Update Status", description: "Use the dropdown to mark a log as clean, suspected, or confirmed cheating. Confirmed entries can be used to ban players from contests.", position: "left" },
];

const AdminAntiCheat = ({ logs, profiles, games, contests, onRefetch }: AdminAntiCheatProps) => {
  const [updating, setUpdating] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLog, setViewerLog] = useState<InputEvent[]>([]);
  const [viewerPlayer, setViewerPlayer] = useState<string>("");
  const [page, setPage] = useState(1);

  const { totalPages, totalItems, pageSize, getPage } = usePagination(logs, 15);
  const paginatedLogs = getPage(page);

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.display_name ?? uid.slice(0, 8);
  const getGame = (gid: string) => games.find(g => g.id === gid)?.title ?? "—";
  const getContest = (cid: string) => contests.find(c => c.id === cid)?.title ?? "—";

  const getInputLog = (log: AntiCheatLog): InputEvent[] | null => {
    try {
      const evidence = log.evidence as any;
      if (evidence?.inputLog && Array.isArray(evidence.inputLog) && evidence.inputLog.length > 0) {
        return evidence.inputLog;
      }
    } catch {}
    return null;
  };

  const handleViewInputs = (log: AntiCheatLog) => {
    const inputLog = getInputLog(log);
    if (!inputLog) return;
    setViewerLog(inputLog);
    setViewerPlayer(getName(log.user_id));
    setViewerOpen(true);
  };

  const handleStatusChange = async (logId: string, newStatus: string) => {
    setUpdating(logId);
    const { error } = await supabase
      .from("anti_cheat_logs")
      .update({ status: newStatus as "clean" | "suspected" | "confirmed" })
      .eq("id", logId);
    setUpdating(null);
    if (handleSupabaseError(error, "Anti-cheat", { onRetry: () => handleStatusChange(logId, newStatus) })) return;
    toast.success("Status updated"); onRefetch?.();
  };

  // Removed early return so pagination wrapper always renders

  return (
    <>
      <div className="rounded-lg border border-border/50 bg-card overflow-hidden" data-tour="aac-table">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Player</th>
              <th className="px-4 py-3 text-left font-medium">Game</th>
              <th className="px-4 py-3 text-left font-medium">Contest</th>
              <th className="px-4 py-3 text-left font-medium">Reason</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Inputs</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map(log => {
              const hasInputs = !!getInputLog(log);
              return (
                <tr key={log.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-foreground">{getName(log.user_id)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{getGame(log.game_id)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{getContest(log.contest_id)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{log.reason ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={`gap-1 ${statusColors[log.status]}`}>
                      {statusIcons[log.status]} {log.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      disabled={!hasInputs}
                      onClick={() => handleViewInputs(log)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {hasInputs ? "View" : "—"}
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-right" data-tour="aac-action">
                    <Select
                      value={log.status}
                      onValueChange={v => handleStatusChange(log.id, v)}
                      disabled={updating === log.id}
                    >
                      <SelectTrigger className="w-32 border-border bg-secondary/50 text-foreground text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-card">
                        <SelectItem value="clean">Clean</SelectItem>
                        <SelectItem value="suspected">Suspected</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No anti-cheat logs yet.</td></tr>
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

      <InputReplayViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        inputLog={viewerLog}
        playerName={viewerPlayer}
      />

      <OnboardingTour steps={ADMIN_AC_TOUR} storageKey="tour-admin-anticheat" />
    </>
  );
};

export default AdminAntiCheat;
