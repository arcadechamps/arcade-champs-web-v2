import { useState, useEffect, useRef } from "react";
import { Plus, Trophy, Clock, Crown, Pencil, Trash2, Users, ChevronDown, ChevronUp, Ban, ShieldCheck, Image as ImageIcon, Video, Keyboard, Gift, Mail, CheckCircle, Upload, X } from "lucide-react";
import OnboardingTour, { type TourStep } from "@/components/OnboardingTour";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { handleSupabaseError } from "@/lib/network-error-handler";
import GameplayMediaViewer from "@/components/dashboard/GameplayMediaViewer";
import TablePagination, { usePagination } from "@/components/dashboard/TablePagination";
import InputReplayViewer, { type InputEvent } from "@/components/dashboard/InputReplayViewer";
import { getEffectiveStatus } from "@/utils/contestStatus";
import { datetimeLocalToIso, isoToDatetimeLocal, formatDateTime } from "@/lib/datetime";
import type { Contest, Game, ContestWinner, ContestParticipant, Profile, GameSession, ContestStatus, AntiCheatLog } from "@/types/database";

interface AdminContestManagerProps {
  contests: Contest[];
  games: Game[];
  winners: ContestWinner[];
  participants?: ContestParticipant[];
  profiles?: Profile[];
  sessions?: GameSession[];
  antiCheatLogs?: AntiCheatLog[];
  onRefetch?: () => void;
}

const statusColors: Record<string, string> = {
  active: "bg-neon-green/20 text-neon-green border-neon-green/30",
  upcoming: "bg-primary/20 text-primary border-primary/30",
  closed: "bg-muted text-muted-foreground border-border",
};

/** Derive contest status from dates */
function deriveStatusFromDates(startsAt: string | null, endsAt: string | null): ContestStatus {
  const now = new Date();
  if (endsAt && new Date(endsAt) <= now) return "closed";
  if (startsAt && new Date(startsAt) <= now) return "active";
  return "upcoming";
}

/** Validate contest dates. Returns error message or null. */
function validateDates(startsAt: string, endsAt: string, allowPastStart: boolean): string | null {
  const now = new Date();

  if (endsAt && !startsAt) {
    return "End date requires a start date.";
  }

  if (startsAt && !allowPastStart && new Date(startsAt) < now) {
    return "Start date cannot be in the past.";
  }

  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    return "End date must be after start date.";
  }

  return null;
}

const ADMIN_CONTEST_TOUR: TourStep[] = [
  { targetSelector: '[data-tour="ac-create"]', title: "Create a Contest", description: "Set up new contests with entry fees, timers, and game selections. Players compete for prizes!", position: "bottom" },
  { targetSelector: '[data-tour="ac-list"]', title: "Contest List", description: "View all contests with live status badges. Expand any contest to see its participants, scores, and evidence.", position: "top" },
  { targetSelector: '[data-tour="ac-list"]', title: "Participants & Scores", description: "Click the expand arrow on a contest to see ranked participants, ban/unban players, and review screenshots & recordings.", position: "top" },
  { targetSelector: '[data-tour="ac-list"]', title: "Declare Winners", description: "Once a contest is closed, use the 'Winner' button to declare the top scorer and optionally credit their wallet.", position: "top" },
];

const AdminContestManager = ({ contests, games, winners, participants = [], profiles = [], sessions = [], antiCheatLogs = [], onRefetch }: AdminContestManagerProps) => {
  const STORAGE_BASE = "https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public";
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [createPrizeType, setCreatePrizeType] = useState<"physical" | "gift_card" | "cash">("physical");
  const [editPrizeType, setEditPrizeType] = useState<"physical" | "gift_card" | "cash">("physical");
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [expandedContest, setExpandedContest] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const [contestPage, setContestPage] = useState(1);

  // Prize image state
  const [createPrizeFile, setCreatePrizeFile] = useState<File | null>(null);
  const [createPrizePreview, setCreatePrizePreview] = useState<string | null>(null);
  const [editPrizeFile, setEditPrizeFile] = useState<File | null>(null);
  const [editPrizePreview, setEditPrizePreview] = useState<string | null>(null);
  const [editPrizeRemoved, setEditPrizeRemoved] = useState(false);
  const createFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const handlePrizeFileSelect = (file: File | null, mode: "create" | "edit") => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (mode === "create") { setCreatePrizeFile(file); setCreatePrizePreview(url); }
    else { setEditPrizeFile(file); setEditPrizePreview(url); setEditPrizeRemoved(false); }
  };

  const uploadPrizeImage = async (file: File, slug: string): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `contest-prizes/${slug}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("game-thumbnails").upload(path, file, { upsert: true });
    if (error) { toast.error("Failed to upload prize image"); return null; }
    return path;
  };

  // Ban/unban state
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<{ userId: string; contestId: string; isBanned: boolean } | null>(null);
  const [banReason, setBanReason] = useState("");

  // Media viewer state
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerType, setMediaViewerType] = useState<"screenshot" | "recording">("screenshot");
  // Input replay viewer state
  const [inputViewerOpen, setInputViewerOpen] = useState(false);
  const [inputViewerLog, setInputViewerLog] = useState<InputEvent[]>([]);
  const [inputViewerPlayer, setInputViewerPlayer] = useState<string>("");
  const [mediaViewerSession, setMediaViewerSession] = useState<GameSession | null>(null);

  // Winner emails & fulfillment toggle
  const [winnerEmails, setWinnerEmails] = useState<Record<string, string>>({});
  const [fulfillmentMap, setFulfillmentMap] = useState<Record<string, string>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize fulfillment map from winners
    const fMap: Record<string, string> = {};
    const nMap: Record<string, string> = {};
    winners.forEach(w => { 
      fMap[w.contest_id] = w.fulfillment_status ?? 'pending';
      nMap[w.contest_id] = w.fulfillment_notes ?? '';
    });
    setFulfillmentMap(fMap);
    setNotesMap(nMap);

    // Fetch winner emails
    const userIds = [...new Set(winners.map(w => w.user_id))];
    if (userIds.length > 0) {
      supabase.rpc("get_user_emails", { user_ids: userIds }).then(({ data }) => {
        const emails: Record<string, string> = {};
        (data ?? []).forEach((r: any) => { emails[r.user_id] = r.email; });
        setWinnerEmails(emails);
      });
    }
  }, [winners]);

  const handleUpdateFulfillment = async (contestId: string, userId: string, status: string, notes: string) => {
    setFulfillmentMap(prev => ({ ...prev, [contestId]: status }));
    setNotesMap(prev => ({ ...prev, [contestId]: notes }));
    const { error } = await supabase.from("contest_winners").update({ fulfillment_status: status as any, fulfillment_notes: notes }).eq("contest_id", contestId).eq("user_id", userId);
    if (error) {
      toast.error("Failed to update fulfillment status");
      onRefetch?.();
    } else {
      toast.success("Fulfillment updated");
    }
  };

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.display_name ?? uid.slice(0, 8);

  // --- Ban / Unban ---
  const openBanDialog = (userId: string, contestId: string, isBanned: boolean) => {
    setBanTarget({ userId, contestId, isBanned });
    setBanReason("");
    setBanDialogOpen(true);
  };

  const handleBanUnban = async () => {
    if (!banTarget) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("contest_participants")
      .update({
        is_banned: !banTarget.isBanned,
        ban_reason: banTarget.isBanned ? null : (banReason || "No reason provided"),
      })
      .eq("contest_id", banTarget.contestId)
      .eq("user_id", banTarget.userId);
    setSubmitting(false);
    if (handleSupabaseError(error, "Ban player", { onRetry: handleBanUnban })) return;
    else {
      toast.success(banTarget.isBanned ? "Player unbanned" : "Player banned");
      setBanDialogOpen(false);
      onRefetch?.();
    }
  };

  // --- View Media ---
  const openMediaViewer = (session: GameSession, type: "screenshot" | "recording") => {
    setMediaViewerSession(session);
    setMediaViewerType(type);
    setMediaViewerOpen(true);
  };

  // --- View Input Log ---
  const getSessionInputLog = (sessionId: string): InputEvent[] | null => {
    const log = antiCheatLogs.find(l => l.session_id === sessionId);
    if (!log) return null;
    try {
      const evidence = log.evidence as any;
      if (evidence?.inputLog && Array.isArray(evidence.inputLog) && evidence.inputLog.length > 0) {
        return evidence.inputLog;
      }
    } catch {}
    return null;
  };

  const openInputViewer = (session: GameSession) => {
    const inputLog = getSessionInputLog(session.session_id);
    if (!inputLog) return;
    setInputViewerLog(inputLog);
    setInputViewerPlayer(getName(session.user_id));
    setInputViewerOpen(true);
  };

  const handleCreateContest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const fd = new FormData(e.currentTarget);
    const title = fd.get("title") as string;
    const startsAt = fd.get("starts_at") as string;
    const endsAt = fd.get("ends_at") as string;

    // Validate dates — new contests cannot have past start dates
    const dateError = validateDates(startsAt, endsAt, false);
    if (dateError) {
      toast.error(dateError);
      return;
    }

    setSubmitting(true);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const isoStart = datetimeLocalToIso(startsAt);
    const isoEnd = datetimeLocalToIso(endsAt);
    const status = deriveStatusFromDates(isoStart, isoEnd);

    const { data: contestData, error } = await supabase.from("contests").insert({
      title, slug, status,
      description: (fd.get("description") as string) || null,
      session_fee_cents: parseInt(fd.get("fee") as string) || 100,
      session_duration_seconds: (parseInt(fd.get("duration") as string) || 10) * 60,
      prize_description: createPrizeType === "cash" ? null : (fd.get("prize_description") as string) || null,
      prize_cents: createPrizeType === "physical" ? 0 : Math.round(parseFloat(fd.get("prize") as string || "0") * 100),
      starts_at: isoStart,
      ends_at: isoEnd,
      created_by: user.id,
    }).select("id").single();

    if (handleSupabaseError(error, "Contest")) {
      setSubmitting(false);
      return;
    }

    if (contestData && selectedGameIds.length > 0) {
      const gameInserts = selectedGameIds.map((gameId, index) => ({
        contest_id: contestData.id,
        game_id: gameId,
        sort_order: index,
      }));
      await supabase.from("contest_games").insert(gameInserts);
    }

    // Upload prize image if selected
    if (contestData && createPrizeFile) {
      const imagePath = await uploadPrizeImage(createPrizeFile, slug);
      if (imagePath) {
        await supabase.from("contests").update({ prize_image_path: imagePath }).eq("id", contestData.id);
      }
    }

    setSubmitting(false);
    toast.success("Contest created!");
    setCreateOpen(false);
    setSelectedGameIds([]);
    setCreatePrizeFile(null);
    setCreatePrizePreview(null);
    onRefetch?.();
  };

  const [editGameIds, setEditGameIds] = useState<string[]>([]);

  const handleEditContest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedContest) return;

    const fd = new FormData(e.currentTarget);
    const startsAt = fd.get("starts_at") as string;
    const endsAt = fd.get("ends_at") as string;

    // For existing contests, allow past start dates if contest is already active/closed
    const allowPastStart = selectedContest.status !== "upcoming";
    const dateError = validateDates(startsAt, endsAt, allowPastStart);
    if (dateError) {
      toast.error(dateError);
      return;
    }

    setSubmitting(true);
    const isoStart = datetimeLocalToIso(startsAt);
    const isoEnd = datetimeLocalToIso(endsAt);
    const status = deriveStatusFromDates(isoStart, isoEnd);

    const { error } = await supabase.from("contests").update({
      title: fd.get("title") as string,
      description: (fd.get("description") as string) || null,
      status,
      session_fee_cents: parseInt(fd.get("fee") as string) || 100,
      session_duration_seconds: (parseInt(fd.get("duration") as string) || 10) * 60,
      prize_description: editPrizeType === "cash" ? null : (fd.get("prize_description") as string) || null,
      prize_cents: editPrizeType === "physical" ? 0 : Math.round(parseFloat(fd.get("prize") as string || "0") * 100),
      starts_at: isoStart,
      ends_at: isoEnd,
    }).eq("id", selectedContest.id);

    if (!error) {
      await supabase.from("contest_games").delete().eq("contest_id", selectedContest.id);
      if (editGameIds.length > 0) {
        const gameInserts = editGameIds.map((gameId, index) => ({
          contest_id: selectedContest.id,
          game_id: gameId,
          sort_order: index,
        }));
        await supabase.from("contest_games").insert(gameInserts);
      }

      // Handle prize image
      if (editPrizeFile) {
        const slug = selectedContest.slug || selectedContest.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const imagePath = await uploadPrizeImage(editPrizeFile, slug);
        if (imagePath) {
          await supabase.from("contests").update({ prize_image_path: imagePath }).eq("id", selectedContest.id);
        }
      } else if (editPrizeRemoved) {
        await supabase.from("contests").update({ prize_image_path: null }).eq("id", selectedContest.id);
      }
    }

    setSubmitting(false);
    if (handleSupabaseError(error, "Contest")) return;
    toast.success("Contest updated!"); setEditOpen(false); setEditPrizeFile(null); setEditPrizePreview(null); setEditPrizeRemoved(false); onRefetch?.();
  };

  const openEditDialog = async (contest: Contest) => {
    setSelectedContest(contest);
    const { data } = await supabase.from("contest_games").select("game_id").eq("contest_id", contest.id).order("sort_order");
    setEditGameIds((data ?? []).map((cg: any) => cg.game_id));
    setEditPrizeFile(null);
    setEditPrizeRemoved(false);
    setEditPrizePreview(contest.prize_image_path ? `${STORAGE_BASE}/game-thumbnails/${contest.prize_image_path}` : null);
    
    if (contest.prize_description && contest.prize_cents > 0) {
      setEditPrizeType("gift_card");
    } else if (contest.prize_description) {
      setEditPrizeType("physical");
    } else {
      setEditPrizeType("cash");
    }

    setEditOpen(true);
  };

  const handleDelete = async (contestId: string) => {
    const { error } = await supabase.from("contests").delete().eq("id", contestId);
    if (handleSupabaseError(error, "Contest")) return;
    toast.success("Contest deleted"); onRefetch?.();
  };

  const handleDeclareWinner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedContest) return;
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const winnerId = fd.get("user_id") as string;
    const winningScore = parseInt(fd.get("score") as string) || 0;
    const payoutDollars = parseFloat(fd.get("payout") as string) || 0;
    const payoutCents = Math.round(payoutDollars * 100);

    const { error } = await supabase.from("contest_winners").insert({
      contest_id: selectedContest.id,
      user_id: winnerId,
      winning_score: winningScore,
      payout_cents: payoutCents,
      declared_by: user.id,
    });
    if (handleSupabaseError(error, "Declare winner")) {
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    toast.success("Winner declared! Make sure to award their prize manually.");
    setDeclareOpen(false);
    onRefetch?.();
  };

  const getContestParticipants = (contestId: string) => participants.filter(p => p.contest_id === contestId);

  const getBestScore = (userId: string, contestId: string): number | null => {
    const userSessions = sessions.filter(s => s.user_id === userId && s.contest_id === contestId && s.score != null && s.score > 0);
    if (userSessions.length === 0) return null;
    return Math.max(...userSessions.map(s => s.score!));
  };

  /** Returns ALL sessions for a user in a contest, sorted newest-first */
  const getAllUserSessions = (userId: string, contestId: string): GameSession[] => {
    return sessions
      .filter(s => s.user_id === userId && s.contest_id === contestId)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  };

  const getRankedParticipants = (contestId: string) => {
    return getContestParticipants(contestId)
      .map(p => ({
        ...p,
        bestScore: getBestScore(p.user_id, contestId),
        gameSessions: getAllUserSessions(p.user_id, contestId),
      }))
      .sort((a, b) => (b.bestScore ?? -1) - (a.bestScore ?? -1));
  };

  const getGameTitle = (gameId: string) => games.find(g => g.id === gameId)?.title ?? "Unknown";

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/80 neon-border gap-2" data-tour="ac-create">
              <Plus className="h-4 w-4" /> Create Contest
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border/50 bg-card max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-arcade text-xs text-foreground">Create Contest</DialogTitle>
              <DialogDescription className="text-muted-foreground">Fill in the details to create a new contest.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateContest} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Title</Label>
                <Input name="title" required placeholder="Championship Title" className="border-border bg-secondary/50 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Description</Label>
                <Textarea name="description" placeholder="Contest description..." className="border-border bg-secondary/50 text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Entry Fee (cents)</Label>
                  <Input name="fee" type="number" min="0" defaultValue="100" className="border-border bg-secondary/50 text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Game Timer (minutes)</Label>
                  <Input name="duration" type="number" min="1" step="1" defaultValue="10" className="border-border bg-secondary/50 text-foreground" />
                  <p className="text-[10px] text-muted-foreground">How long each player gets per session</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Prize Type</Label>
                <Select value={createPrizeType} onValueChange={(val: any) => setCreatePrizeType(val)}>
                  <SelectTrigger className="border-border bg-secondary/50 text-foreground w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="physical">Physical Prize</SelectItem>
                    <SelectItem value="gift_card">Gift Card</SelectItem>
                    <SelectItem value="cash">Cash Value</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {createPrizeType !== "cash" && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Prize Description</Label>
                    <Input name="prize_description" placeholder={createPrizeType === "gift_card" ? "e.g. $50 Amazon Gift Card" : "e.g. PlayStation 5"} className="border-border bg-secondary/50 text-foreground" required />
                  </div>
                )}
                {createPrizeType !== "physical" && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Est. Value ($)</Label>
                    <Input name="prize" type="number" min="0" step="0.01" defaultValue="0" className="border-border bg-secondary/50 text-foreground" required />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground -mt-2">Values set based on prize type selected.</p>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Prize Image (optional)</Label>
                <input ref={createFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePrizeFileSelect(e.target.files?.[0] ?? null, "create")} />
                {createPrizePreview ? (
                  <div className="relative w-full rounded-lg border border-border overflow-hidden bg-secondary/30">
                    <img src={createPrizePreview} alt="Prize preview" className="w-full max-h-40 object-contain" />
                    <Button type="button" size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background" onClick={() => { setCreatePrizeFile(null); setCreatePrizePreview(null); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="w-full border-dashed border-border text-muted-foreground gap-2" onClick={() => createFileRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> Upload Prize Image
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground">Show prize image on the contest card (e.g., PS5, gift card)</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Starts At</Label>
                  <Input name="starts_at" type="datetime-local" className="border-border bg-secondary/50 text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Ends At</Label>
                  <Input name="ends_at" type="datetime-local" className="border-border bg-secondary/50 text-foreground" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Status is automatically set based on start/end dates.</p>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Contest Games</Label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-2">
                  {games.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center">No games available. Add games first.</p>
                  )}
                  {games.filter(g => g.is_active).map((g) => (
                    <label key={g.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGameIds.includes(g.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedGameIds(prev => [...prev, g.id]);
                          else setSelectedGameIds(prev => prev.filter(id => id !== g.id));
                        }}
                        className="accent-primary"
                      />
                      <span className="text-foreground">{g.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{g.slug}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/80 neon-border-pink">
                {submitting ? "Creating..." : "Create Contest"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(() => {
        const { totalPages, totalItems, pageSize, getPage } = usePagination(contests, 10);
        const paginatedContests = getPage(contestPage);
        return (
          <div className="space-y-4" data-tour="ac-list">
            {paginatedContests.map((contest) => {
              const effectiveStatus = getEffectiveStatus(contest);
              const winner = winners.find(w => w.contest_id === contest.id);
              const cParticipants = getContestParticipants(contest.id);
              const isExpanded = expandedContest === contest.id;

              return (
                <div key={contest.id} className="rounded-lg border border-border/50 bg-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex items-center gap-2 flex-wrap">
                        <h3 className="font-arcade text-[10px] leading-relaxed text-foreground">{contest.title}</h3>
                        <Badge variant="outline" className={statusColors[effectiveStatus] ?? ""}>{effectiveStatus}</Badge>
                        <Badge variant="outline" className="border-border/50 text-muted-foreground gap-1">
                          <Users className="h-3 w-3" /> {cParticipants.length}
                        </Badge>
                      </div>
                      {contest.description && <p className="mb-3 text-xs text-muted-foreground">{contest.description}</p>}
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-neon-pink" /> Fee: ${(contest.session_fee_cents / 100).toFixed(2)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {contest.session_duration_seconds / 60}min</span>
                        {contest.prize_cents > 0 && (
                          <span className="flex items-center gap-1 text-neon-green"><Gift className="h-3 w-3" /> Prize: ${(contest.prize_cents / 100).toLocaleString()}</span>
                        )}
                        {contest.starts_at && <span>Start: {formatDateTime(contest.starts_at)}</span>}
                        {contest.ends_at && <span>End: {formatDateTime(contest.ends_at)}</span>}
                      </div>
                      {winner && (
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <Crown className="h-3 w-3 text-neon-pink" />
                            <span className="text-neon-pink">Winner: {getName(winner.user_id)} — Score: {winner.winning_score.toLocaleString()} — Prize Value: ${(winner.payout_cents / 100).toFixed(2)}</span>
                          </div>
                          {winnerEmails[winner.user_id] && (
                            <div className="flex items-center gap-2 text-xs ml-5">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{winnerEmails[winner.user_id]}</span>
                            </div>
                          )}
                          <div className="flex flex-col gap-2 mt-2 ml-4 p-2 rounded border border-border/30 bg-background/50">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Fulfillment Tracking</span>
                            <div className="flex gap-2 items-center">
                              <Select value={fulfillmentMap[contest.id] ?? 'pending'} onValueChange={(val) => handleUpdateFulfillment(contest.id, winner.user_id, val, notesMap[contest.id] ?? '')}>
                                <SelectTrigger className="w-[120px] h-8 text-xs bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="processing">Processing</SelectItem>
                                  <SelectItem value="shipped">Shipped</SelectItem>
                                  <SelectItem value="emailed">Emailed</SelectItem>
                                  <SelectItem value="delivered">Delivered</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input 
                                placeholder="Tracking link or Gift Card code..." 
                                className="h-8 text-xs bg-secondary/50 border-border flex-1"
                                value={notesMap[contest.id] ?? ''}
                                onChange={(e) => setNotesMap(prev => ({...prev, [contest.id]: e.target.value}))}
                                onBlur={() => handleUpdateFulfillment(contest.id, winner.user_id, fulfillmentMap[contest.id] ?? 'pending', notesMap[contest.id] ?? '')}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => setExpandedContest(isExpanded ? null : contest.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(contest)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-border/50 bg-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">Delete Contest?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete "{contest.title}".</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleDelete(contest.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      {!winner && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className={`gap-1 ${effectiveStatus === "closed" ? "border-neon-pink text-neon-pink hover:bg-accent/10" : "border-muted/50 text-muted-foreground"}`} 
                          onClick={() => { setSelectedContest(contest); setDeclareOpen(true); }}
                          disabled={effectiveStatus !== "closed"}
                          title={effectiveStatus !== "closed" ? "Contest must be closed to declare a winner" : "Declare Winner"}
                        >
                          <Crown className="h-3 w-3" /> Winner
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded participants with ban/unban and screenshot */}
                  {isExpanded && cParticipants.length > 0 && (
                    <div className="mt-4 border-t border-border/30 pt-4">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Participants ranked by score ({cParticipants.length})</p>
                      <div className="space-y-1">
                        {getRankedParticipants(contest.id).map((p, idx) => (
                          <div key={p.user_id} className={`rounded px-3 py-2 text-xs hover:bg-secondary/30 ${p.is_banned ? "opacity-50" : ""}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-5 text-center text-muted-foreground font-medium">{idx + 1}</span>
                                <span className="text-foreground">{getName(p.user_id)}</span>
                                {p.is_banned && (
                                  <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px]" title={p.ban_reason ?? ""}>
                                    Banned
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-arcade text-[10px] text-primary min-w-[50px] text-right">
                                  {p.bestScore != null ? p.bestScore.toLocaleString() : "—"}
                                </span>
                                {/* Ban / Unban */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={`h-6 w-6 p-0 ${p.is_banned ? "text-neon-green hover:text-neon-green" : "text-destructive hover:text-destructive"}`}
                                  title={p.is_banned ? "Unban player" : "Ban player"}
                                  onClick={() => openBanDialog(p.user_id, contest.id, p.is_banned)}
                                >
                                  {p.is_banned ? <ShieldCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                            </div>
                            {/* All session rows */}
                            {p.gameSessions.length > 0 && (
                              <div className="ml-7 mt-1 space-y-0.5">
                                {p.gameSessions.map((gs) => (
                                  <div key={gs.session_id} className="flex items-center justify-between text-[10px] py-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">{getGameTitle(gs.game_id)}</span>
                                      <span className="text-muted-foreground/60">{formatDateTime(gs.started_at)}</span>
                                      <Badge variant="outline" className={`text-[8px] px-1 py-0 ${gs.status === "flagged" ? "border-destructive/30 text-destructive" : gs.status === "ended" ? "border-muted-foreground/30 text-muted-foreground" : "border-neon-green/30 text-neon-green"}`}>
                                        {gs.status}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-arcade text-primary">{(gs.score ?? 0).toLocaleString()}</span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className={`h-5 w-5 p-0 ${gs.screenshot_path ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}
                                        title={gs.screenshot_path ? "View screenshot" : "No screenshot"}
                                        disabled={!gs.screenshot_path}
                                        onClick={() => openMediaViewer(gs, "screenshot")}
                                      >
                                        <ImageIcon className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className={`h-5 w-5 p-0 ${gs.recording_path ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}
                                        title={gs.recording_path ? "Watch recording" : "No recording"}
                                        disabled={!gs.recording_path}
                                        onClick={() => openMediaViewer(gs, "recording")}
                                      >
                                        <Video className="h-3 w-3" />
                                      </Button>
                                      {(() => {
                                        const hasInputs = !!getSessionInputLog(gs.session_id);
                                        return (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className={`h-5 w-5 p-0 ${hasInputs ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}
                                            title={hasInputs ? "View input log" : "No input data"}
                                            disabled={!hasInputs}
                                            onClick={() => openInputViewer(gs)}
                                          >
                                            <Keyboard className="h-3 w-3" />
                                          </Button>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {isExpanded && cParticipants.length === 0 && (
                    <div className="mt-4 border-t border-border/30 pt-4">
                      <p className="text-xs text-muted-foreground">No participants yet.</p>
                    </div>
                  )}
                </div>
              );
            })}
            {contests.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No contests yet.</p>
            )}
            <TablePagination
              currentPage={contestPage}
              totalPages={totalPages}
              onPageChange={setContestPage}
              totalItems={totalItems}
              pageSize={pageSize}
            />
          </div>
        );
      })()}

      {/* Ban/Unban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="border-border/50 bg-card">
          <DialogHeader>
            <DialogTitle className="font-arcade text-xs text-foreground">
              {banTarget?.isBanned ? "Unban Player" : "Ban Player"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {banTarget?.isBanned
                ? `Unban ${getName(banTarget?.userId ?? "")} from this contest?`
                : `Ban ${getName(banTarget?.userId ?? "")} from this contest. Provide a reason.`}
            </DialogDescription>
          </DialogHeader>
          {!banTarget?.isBanned && (
            <div className="space-y-2 pt-2">
              <Label className="text-muted-foreground">Reason</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason for banning..."
                className="border-border bg-secondary/50 text-foreground"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setBanDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleBanUnban}
              disabled={submitting}
              className={banTarget?.isBanned ? "bg-neon-green/20 text-neon-green hover:bg-neon-green/30" : "bg-destructive text-destructive-foreground hover:bg-destructive/80"}
            >
              {submitting ? "Processing..." : banTarget?.isBanned ? "Unban" : "Ban Player"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Viewer (Screenshot + Recording) */}
      <GameplayMediaViewer
        open={mediaViewerOpen}
        onOpenChange={setMediaViewerOpen}
        type={mediaViewerType}
        session={mediaViewerSession}
        playerName={mediaViewerSession ? getName(mediaViewerSession.user_id) : undefined}
        gameTitle={mediaViewerSession ? getGameTitle(mediaViewerSession.game_id) : undefined}
      />

      {/* Input Replay Viewer */}
      <InputReplayViewer
        open={inputViewerOpen}
        onOpenChange={setInputViewerOpen}
        inputLog={inputViewerLog}
        playerName={inputViewerPlayer}
      />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-border/50 bg-card max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-arcade text-xs text-foreground">Edit Contest</DialogTitle>
            <DialogDescription className="text-muted-foreground">Update contest details.</DialogDescription>
          </DialogHeader>
          {selectedContest && (
            <form onSubmit={handleEditContest} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Title</Label>
                <Input name="title" required defaultValue={selectedContest.title} className="border-border bg-secondary/50 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Description</Label>
                <Textarea name="description" defaultValue={selectedContest.description ?? ""} className="border-border bg-secondary/50 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusColors[getEffectiveStatus(selectedContest)] ?? ""}>
                    {getEffectiveStatus(selectedContest)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">Automatically determined by start/end dates</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Fee (cents)</Label>
                  <Input name="fee" type="number" min="0" defaultValue={selectedContest.session_fee_cents} className="border-border bg-secondary/50 text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Game Timer (minutes)</Label>
                  <Input name="duration" type="number" min="1" step="1" defaultValue={Math.round(selectedContest.session_duration_seconds / 60)} className="border-border bg-secondary/50 text-foreground" />
                  <p className="text-[10px] text-muted-foreground">Currently {Math.floor(selectedContest.session_duration_seconds / 60)}m {selectedContest.session_duration_seconds % 60}s</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Prize Type</Label>
                <Select value={editPrizeType} onValueChange={(val: any) => setEditPrizeType(val)}>
                  <SelectTrigger className="border-border bg-secondary/50 text-foreground w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="physical">Physical Prize</SelectItem>
                    <SelectItem value="gift_card">Gift Card</SelectItem>
                    <SelectItem value="cash">Cash Value</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {editPrizeType !== "cash" && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Prize Description</Label>
                    <Input name="prize_description" defaultValue={selectedContest.prize_description ?? ""} placeholder={editPrizeType === "gift_card" ? "e.g. $50 Amazon Gift Card" : "e.g. PlayStation 5"} className="border-border bg-secondary/50 text-foreground" required />
                  </div>
                )}
                {editPrizeType !== "physical" && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Est. Value ($)</Label>
                    <Input name="prize" type="number" min="0" step="0.01" defaultValue={(selectedContest.prize_cents / 100).toFixed(2)} className="border-border bg-secondary/50 text-foreground" required />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground -mt-2">Values set based on prize type selected.</p>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Prize Image (optional)</Label>
                <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePrizeFileSelect(e.target.files?.[0] ?? null, "edit")} />
                {editPrizePreview && !editPrizeRemoved ? (
                  <div className="relative w-full rounded-lg border border-border overflow-hidden bg-secondary/30">
                    <img src={editPrizePreview} alt="Prize preview" className="w-full max-h-40 object-contain" />
                    <Button type="button" size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background" onClick={() => { setEditPrizeFile(null); setEditPrizePreview(null); setEditPrizeRemoved(true); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="w-full border-dashed border-border text-muted-foreground gap-2" onClick={() => editFileRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> {editPrizeRemoved ? "Upload New Prize Image" : "Upload Prize Image"}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Starts At</Label>
                  <Input name="starts_at" type="datetime-local" defaultValue={isoToDatetimeLocal(selectedContest.starts_at)} className="border-border bg-secondary/50 text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Ends At</Label>
                  <Input name="ends_at" type="datetime-local" defaultValue={isoToDatetimeLocal(selectedContest.ends_at)} className="border-border bg-secondary/50 text-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Contest Games</Label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-2">
                  {games.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center">No games available.</p>
                  )}
                  {games.filter(g => g.is_active).map((g) => (
                    <label key={g.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editGameIds.includes(g.id)}
                        onChange={(e) => {
                          if (e.target.checked) setEditGameIds(prev => [...prev, g.id]);
                          else setEditGameIds(prev => prev.filter(id => id !== g.id));
                        }}
                        className="accent-primary"
                      />
                      <span className="text-foreground">{g.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{g.slug}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/80 neon-border-pink">
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Declare Winner Dialog */}
      <Dialog open={declareOpen} onOpenChange={setDeclareOpen}>
        <DialogContent className="border-border/50 bg-card">
          <DialogHeader>
            <DialogTitle className="font-arcade text-xs text-foreground">Declare Winner</DialogTitle>
            <DialogDescription className="text-muted-foreground">Declare winner for "{selectedContest?.title}".</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeclareWinner} className="space-y-4 pt-2">
            {(() => {
              const ranked = selectedContest ? getRankedParticipants(selectedContest.id).filter(p => !p.is_banned) : [];
              const topScorer = ranked.length > 0 && ranked[0].bestScore != null ? ranked[0] : null;
              return (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Winner</Label>
                    {selectedContest && ranked.length > 0 ? (
                      <Select name="user_id" required defaultValue={topScorer?.user_id}>
                        <SelectTrigger className="border-border bg-secondary/50 text-foreground"><SelectValue placeholder="Select participant" /></SelectTrigger>
                        <SelectContent className="border-border bg-card">
                          {ranked.map((p, i) => (
                            <SelectItem key={p.user_id} value={p.user_id}>
                              #{i + 1} {getName(p.user_id)} {p.bestScore != null ? `— ${p.bestScore.toLocaleString()} pts` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input name="user_id" required placeholder="user-uuid" className="border-border bg-secondary/50 text-foreground" />
                    )}
                    {topScorer && (
                      <p className="text-[10px] text-muted-foreground">Top scorer: {getName(topScorer.user_id)} with {topScorer.bestScore!.toLocaleString()} pts</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Winning Score</Label>
                      <Input name="score" type="number" required defaultValue={topScorer?.bestScore ?? ""} className="border-border bg-secondary/50 text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Prize Monetary Value ($)</Label>
                      <Input name="payout" type="number" min="0" step="0.01" defaultValue={topScorer ? (selectedContest?.prize_cents / 100).toFixed(2) : "0.00"} className="border-border bg-secondary/50 text-foreground" />
                      <p className="text-[10px] text-muted-foreground">Logged for records. No automatic wallet top-up.</p>
                    </div>
                  </div>
                </>
              );
            })()}
            <Button type="submit" disabled={submitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/80 neon-border-pink">
              {submitting ? "Declaring..." : "Confirm Winner"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <OnboardingTour steps={ADMIN_CONTEST_TOUR} storageKey="tour-admin-contests" />
    </div>
  );
};

export default AdminContestManager;
