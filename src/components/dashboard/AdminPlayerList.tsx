import { useState } from "react";
import { cn } from "@/lib/utils";
import { Users, DollarSign, CheckCircle, XCircle, Clock, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import OnboardingTour, { type TourStep } from "@/components/OnboardingTour";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import TablePagination, { usePagination } from "@/components/dashboard/TablePagination";
import type { Profile, Wallet, WalletTransaction } from "@/types/database";

interface AdminPlayerListProps {
  profiles: Profile[];
  wallets: Wallet[];
  transactions?: WalletTransaction[];
  onRefetch?: () => void;
}

const STORAGE_BASE = "https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public";

const getAvatarUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `${STORAGE_BASE}/avatars/${url}`;
};

const getInitials = (name: string | null): string => {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
};

const ADMIN_PLAYER_TOUR: TourStep[] = [
  { targetSelector: '[data-tour="ap-withdrawals"]', title: "Pending Withdrawals", description: "Players request payouts here. Review, approve, or reject them. Check their payout method before approving!", position: "bottom" },
  { targetSelector: '[data-tour="ap-search"]', title: "Search Players", description: "Quickly find any player by display name or username. The table filters in real time as you type.", position: "bottom" },
  { targetSelector: '[data-tour="ap-table"]', title: "Player Directory", description: "View every registered player, their wallet balance, and join date. Click 'Adjust' to add or deduct funds.", position: "top" },
];

const AdminPlayerList = ({ profiles, wallets, transactions = [], onRefetch }: AdminPlayerListProps) => {
  const { user } = useAuth();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<{ amount: number; type: string } | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [playerPage, setPlayerPage] = useState(1);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [sortKey, setSortKey] = useState<"player" | "username" | "balance" | "joined" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

  // Withdrawal request action confirmation
  const [withdrawalAction, setWithdrawalAction] = useState<{ tx: WalletTransaction; action: "approve" | "reject" } | null>(null);

  const pendingWithdrawals = transactions.filter(
    t => t.type === "payout" && t.status === "pending"
  );

  const filtered = profiles.filter(p =>
    ((p.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
     (p.username ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const getBalanceCents = (userId: string) => {
    const w = wallets.find(w => w.user_id === userId);
    return w?.balance_cents ?? 0;
  };

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir("asc"); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPlayerPage(1);
  };

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "player":
        return dir * (a.display_name ?? "").localeCompare(b.display_name ?? "");
      case "username":
        return dir * (a.username ?? "").localeCompare(b.username ?? "");
      case "balance":
        return dir * (getBalanceCents(a.user_id) - getBalanceCents(b.user_id));
      case "joined":
        return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default:
        return 0;
    }
  });

  const SortIcon = ({ column }: { column: typeof sortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const getBalance = (userId: string) => {
    const w = wallets.find(w => w.user_id === userId);
    return w ? (w.balance_cents / 100).toFixed(2) : "0.00";
  };

  const getPlayerName = (userId: string) => {
    const p = profiles.find(p => p.user_id === userId);
    return p?.display_name ?? p?.username ?? userId.slice(0, 8);
  };

  const getPlayerProfile = (userId: string) => profiles.find(p => p.user_id === userId);

  const getPayoutInfo = (userId: string) => {
    const p = profiles.find(p => p.user_id === userId);
    return { method: (p as any)?.payout_method ?? null, handle: (p as any)?.payout_handle ?? null };
  };

  const PAYOUT_LABELS: Record<string, string> = {
    paypal: "PayPal",
    venmo: "Venmo",
    cashapp: "CashApp",
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const dollars = parseFloat(fd.get("amount") as string) || 0;
    if (dollars > 10000) {
      toast.error("Amount cannot exceed $10,000 per adjustment.");
      return;
    }
    const amountCents = Math.round(dollars * 100);
    const type = fd.get("type") as string;
    setPendingFormData({ amount: amountCents, type });
    setConfirmOpen(true);
  };

  const handleConfirmedAdjust = async () => {
    if (!user || !selectedPlayer || !pendingFormData) return;
    setSubmitting(true);
    const finalAmount = pendingFormData.type === "deduct" ? -Math.abs(pendingFormData.amount) : Math.abs(pendingFormData.amount);

    const { error } = await supabase.from("wallet_transactions").insert({
      user_id: selectedPlayer.user_id,
      type: "admin_adjust" as const,
      amount_cents: finalAmount,
      status: "succeeded" as const,
    });
    setSubmitting(false);
    setConfirmOpen(false);
    setPendingFormData(null);
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success("Wallet adjusted!");
      setAdjustOpen(false);
      onRefetch?.();
    }
  };

  const handleWithdrawalAction = async () => {
    if (!withdrawalAction) return;
    const { tx, action } = withdrawalAction;

    if (action === "approve") {
      const payout = getPayoutInfo(tx.user_id);
      if (!payout.method) {
        toast.error("Cannot approve: User has no payout method saved.");
        setWithdrawalAction(null);
        return;
      }
    }

    setSubmitting(true);
    const newStatus = action === "approve" ? "succeeded" : "failed";

    const { error } = await supabase
      .from("wallet_transactions")
      .update({ status: newStatus })
      .eq("id", tx.id);

    setSubmitting(false);
    setWithdrawalAction(null);
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success(action === "approve" ? "Withdrawal approved — balance deducted." : "Withdrawal rejected.");
      onRefetch?.();
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Withdrawal Requests */}
      <Card className={`border-border/50 bg-card ${pendingWithdrawals.length > 0 ? "border-accent/30" : ""}`} data-tour="ap-withdrawals">
        <CardHeader className="pb-2">
          <CardTitle className="font-arcade text-[10px] text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            Pending Withdrawal Requests
            {pendingWithdrawals.length > 0 && (
              <Badge variant="outline" className="border-accent/30 text-accent ml-2">
                {pendingWithdrawals.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingWithdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No pending withdrawal requests.</p>
          ) : (
            <div className="space-y-2">
              {pendingWithdrawals.map(tx => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3 border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    {(() => {
                      const player = getPlayerProfile(tx.user_id);
                      return (
                        <Avatar className="h-8 w-8 border border-border/50 shrink-0">
                          <AvatarImage src={getAvatarUrl(player?.avatar_url)} alt={getPlayerName(tx.user_id)} />
                          <AvatarFallback className="bg-secondary text-[10px] font-bold text-muted-foreground">
                            {getInitials(player?.display_name ?? player?.username ?? null)}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })()}
                    <div>
                      <p className="text-sm font-medium text-foreground">{getPlayerName(tx.user_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-accent/30 text-accent font-mono">
                      ${(Math.abs(tx.amount_cents) / 100).toFixed(2)}
                    </Badge>
                    {(() => {
                      const payout = getPayoutInfo(tx.user_id);
                      return payout.method ? (
                        <Badge variant="secondary" className="text-xs">
                          {PAYOUT_LABELS[payout.method] ?? payout.method}: {payout.handle}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">No payout method</Badge>
                      );
                    })()}
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-neon-green/30 text-neon-green hover:bg-neon-green/10 gap-1 h-8 disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => setWithdrawalAction({ tx, action: "approve" })}
                        disabled={!getPayoutInfo(tx.user_id).method}
                        title={!getPayoutInfo(tx.user_id).method ? "User has no payout method" : undefined}
                      >
                        <CheckCircle className="h-3 w-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1 h-8"
                        onClick={() => setWithdrawalAction({ tx, action: "reject" })}
                      >
                        <XCircle className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player List */}
      <Input
        placeholder="Search players..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPlayerPage(1); }}
        className="max-w-sm border-border bg-secondary/50 text-foreground"
        data-tour="ap-search"
      />

      {(() => {
        const { totalPages, totalItems, pageSize, getPage } = usePagination(sorted, 5);
        const pageRows = getPage(playerPage);
        return (
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden" data-tour="ap-table">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">
                    <button type="button" onClick={() => handleSort("player")} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                      Player <SortIcon column="player" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <button type="button" onClick={() => handleSort("username")} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                      Username <SortIcon column="username" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    <button type="button" onClick={() => handleSort("balance")} className="inline-flex items-center gap-1.5 ml-auto hover:text-foreground transition-colors">
                      Balance <SortIcon column="balance" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    <button type="button" onClick={() => handleSort("joined")} className="inline-flex items-center gap-1.5 ml-auto hover:text-foreground transition-colors">
                      Joined <SortIcon column="joined" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(p => (
                  <tr key={p.user_id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 border border-border/50 shrink-0">
                          <AvatarImage src={getAvatarUrl(p.avatar_url)} alt={p.display_name ?? "Player"} />
                          <AvatarFallback className="bg-secondary text-[10px] font-bold text-muted-foreground">
                            {getInitials(p.display_name ?? p.username)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-foreground">{p.display_name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.username ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant="outline" className="border-neon-green/30 text-neon-green">
                        ${getBalance(p.user_id)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary/30 text-primary hover:bg-primary/10 gap-1"
                        onClick={() => { setSelectedPlayer(p); setAdjustOpen(true); }}
                      >
                        <DollarSign className="h-3 w-3" /> Adjust
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No players found.</td></tr>
                )}
              </tbody>
            </table>
            <TablePagination
              currentPage={playerPage}
              totalPages={totalPages}
              onPageChange={setPlayerPage}
              totalItems={totalItems}
              pageSize={pageSize}
            />
          </div>
        );
      })()}

      {/* Adjust Wallet Dialog */}
      <Dialog open={adjustOpen} onOpenChange={(open) => { setAdjustOpen(open); if (!open) setAdjustAmount(""); }}>
        <DialogContent className="border-border/50 bg-card">
          <DialogHeader>
            <DialogTitle className="font-arcade text-xs text-foreground">Adjust Wallet</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Adjust balance for {selectedPlayer?.display_name ?? selectedPlayer?.username ?? "player"}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Type</Label>
              <Select name="type" defaultValue="add">
                <SelectTrigger className="border-border bg-secondary/50 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="add">Add Funds</SelectItem>
                  <SelectItem value="deduct">Deduct Funds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Amount (USD)</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAdjustAmount(String(amt))}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                      parseFloat(adjustAmount) === amt
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium pointer-events-none">$</span>
                <Input
                  name="amount"
                  type="number"
                  min="0.01"
                  max="10000"
                  step="0.01"
                  placeholder="Custom amount"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="border-border bg-secondary/50 text-foreground pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">Max $10,000 per adjustment</p>
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/80 neon-border-pink">
              {submitting ? "Processing..." : "Confirm Adjustment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Wallet Adjust Confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-border/50 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirm Wallet Adjustment</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {pendingFormData && (
                <>
                  You are about to <span className="font-semibold text-foreground">{pendingFormData.type === "deduct" ? "deduct" : "add"}</span>{" "}
                  <span className="font-semibold text-foreground">${(pendingFormData.amount / 100).toFixed(2)}</span> {pendingFormData.type === "deduct" ? "from" : "to"}{" "}
                  <span className="font-semibold text-foreground">{selectedPlayer?.display_name ?? selectedPlayer?.username ?? "this player"}</span>'s wallet.
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedAdjust} disabled={submitting} className="bg-accent text-accent-foreground hover:bg-accent/80">
              {submitting ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdrawal Approve/Reject Confirmation */}
      <AlertDialog open={!!withdrawalAction} onOpenChange={(open) => { if (!open) setWithdrawalAction(null); }}>
        <AlertDialogContent className="border-border/50 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {withdrawalAction?.action === "approve" ? "Approve Withdrawal" : "Reject Withdrawal"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {withdrawalAction && (
                <>
                  {withdrawalAction.action === "approve" ? (
                    <>
                      Approving will <span className="font-semibold text-foreground">deduct ${(Math.abs(withdrawalAction.tx.amount_cents) / 100).toFixed(2)}</span> from{" "}
                      <span className="font-semibold text-foreground">{getPlayerName(withdrawalAction.tx.user_id)}</span>'s wallet.
                      {(() => {
                        const payout = getPayoutInfo(withdrawalAction.tx.user_id);
                        return payout.method ? (
                          <span className="block mt-2 font-semibold text-foreground">
                            Send to: {PAYOUT_LABELS[payout.method] ?? payout.method} — {payout.handle}
                          </span>
                        ) : (
                          <span className="block mt-2 text-destructive font-semibold">⚠ Player has no payout method saved.</span>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      Rejecting will mark this withdrawal request as failed. No balance change will occur for{" "}
                      <span className="font-semibold text-foreground">{getPlayerName(withdrawalAction.tx.user_id)}</span>.
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdrawalAction}
              disabled={submitting || (withdrawalAction?.action === "approve" && !getPayoutInfo(withdrawalAction.tx.user_id).method)}
              className={withdrawalAction?.action === "approve"
                ? "bg-neon-green text-background hover:bg-neon-green/80"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/80"
              }
            >
              {submitting ? "Processing..." : withdrawalAction?.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <OnboardingTour steps={ADMIN_PLAYER_TOUR} storageKey="tour-admin-players" />
    </div>
  );
};

export default AdminPlayerList;
