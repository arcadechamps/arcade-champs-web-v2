import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, Plus, Settings, ExternalLink, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleNetworkError, handleSupabaseError } from "@/lib/network-error-handler";
import { useQueryClient } from "@tanstack/react-query";
import TablePagination, { usePagination } from "@/components/dashboard/TablePagination";
import type { Wallet as WalletType, WalletTransaction } from "@/types/database";
import OnboardingTour, { type TourStep } from "@/components/OnboardingTour";

const TOUR_STEPS: TourStep[] = [
  { targetSelector: '[data-tour="wallet-add"]', title: "Add Funds", description: "Top up your wallet via Stripe — fast, secure, and instant. You'll need a balance to enter contests!", position: "bottom" },
  { targetSelector: '[data-tour="wallet-withdraw"]', title: "Withdraw Winnings", description: "Won some cash? Request a payout here. Admins will review and send it to your preferred method.", position: "bottom" },
  { targetSelector: '[data-tour="wallet-history"]', title: "Transaction History", description: "Every deposit, fee, and payout is logged here. Full transparency on where your coins go!", position: "top" },
];

interface WalletPanelProps {
  wallet: WalletType;
  transactions: WalletTransaction[];
  onRefetch?: () => void;
}

const txTypeConfig: Record<string, { icon: typeof ArrowDownCircle; label: string; color: string }> = {
  topup: { icon: ArrowDownCircle, label: "Top Up", color: "text-neon-green" },
  payout: { icon: ArrowUpCircle, label: "Payout", color: "text-neon-green" },
  session_fee: { icon: DollarSign, label: "Contest Fee", color: "text-accent" },
  admin_adjust: { icon: Settings, label: "Arcade Champs Adjustment", color: "text-primary" },
};

const WalletPanel = ({ wallet, transactions, onRefetch }: WalletPanelProps) => {
  const [addAmount, setAddAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const [txPage, setTxPage] = useState(1);
  const queryClient = useQueryClient();

  const { totalPages, totalItems, pageSize, getPage } = usePagination(transactions, 10);
  const paginatedTx = getPage(txPage);

  const handleAddFunds = async () => {
    const cents = Math.round(parseFloat(addAmount) * 100);
    if (isNaN(cents) || cents < 100 || cents > 100000) {
      toast.error("Amount must be between $1.00 and $1,000.00");
      return;
    }
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-wallet-topup", {
        body: { amount_cents: cents },
      });

      if (error) {
        console.error("create-wallet-topup error:", error);
        handleNetworkError(error, "Payment", { onRetry: handleAddFunds });
        return;
      }

      if (data?.error) {
        console.error("create-wallet-topup returned error:", data.error);
        toast.error("Payment error: " + data.error);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("No checkout URL received");
      }
    } catch (e: any) {
      handleNetworkError(e, "Payment", { onRetry: handleAddFunds });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    const cents = Math.round(parseFloat(withdrawAmount) * 100);
    if (isNaN(cents) || cents < 100) {
      toast.error("Minimum withdrawal is $1.00");
      return;
    }
    if (cents > wallet.balance_cents) {
      toast.error("Insufficient balance");
      return;
    }
    setWithdrawing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); setWithdrawing(false); return; }

    const { error } = await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      type: "payout" as const,
      status: "pending" as const,
      amount_cents: -cents,
      meta: { source: "withdrawal_request" },
    });

    setWithdrawing(false);
    if (handleSupabaseError(error, "Withdrawal", { onRetry: handleRequestWithdrawal })) return;
    toast.success("Withdrawal request submitted! An admin will review it.");
    setWithdrawOpen(false);
    setWithdrawAmount("");
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    onRefetch?.();
  };

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="rounded-lg border border-border/50 bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Available Balance</p>
            <p className={
              `mt-1 font-arcade text-xl  ${(wallet.balance_cents / 100) < 5 ? 'text-red-400 animate-pulse' : 'text-neon-green text-glow-blue'}`
             }>
              ${(wallet.balance_cents / 100).toFixed(2)}
            </p>
          </div>
          <div className="flex gap-2">
            {/* Withdraw Button */}
            <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2" data-tour="wallet-withdraw">
                  <ArrowUpCircle className="h-4 w-4" /> Withdraw
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border/50 bg-card">
                <DialogHeader>
                  <DialogTitle className="font-arcade text-xs text-foreground">Request Withdrawal</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Submit a payout request. An admin will review and process it.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Amount (USD)</Label>
                    <Input
                      type="number"
                      min="1"
                      max={(wallet.balance_cents / 100).toFixed(2)}
                      step="0.01"
                      placeholder="10.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="border-border bg-secondary/50 text-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      Available: <span className="text-neon-green">${(wallet.balance_cents / 100).toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {[5, 10, 25].map((amt) => (
                      <Button
                        key={amt}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-border text-muted-foreground hover:text-foreground"
                        onClick={() => setWithdrawAmount(Math.min(amt, wallet.balance_cents / 100).toString())}
                        disabled={wallet.balance_cents < amt * 100}
                      >
                        ${amt}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-border text-muted-foreground hover:text-foreground"
                      onClick={() => setWithdrawAmount((wallet.balance_cents / 100).toFixed(2))}
                      disabled={wallet.balance_cents < 100}
                    >
                      All
                    </Button>
                  </div>
                  <Button
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/80 gap-2"
                    onClick={handleRequestWithdrawal}
                    disabled={withdrawing || !withdrawAmount}
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    {withdrawing ? "Submitting..." : "Request Withdrawal"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Withdrawal requests are reviewed by an admin before processing.
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Funds Button */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/80 neon-border gap-2" data-tour="wallet-add">
                  <Plus className="h-4 w-4" /> Add Funds
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border/50 bg-card">
                <DialogHeader>
                  <DialogTitle className="font-arcade text-xs text-foreground">Add Funds via Stripe</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Choose an amount to deposit. You'll be redirected to Stripe for secure payment.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Amount (USD)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      step="0.01"
                      placeholder="10.00"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      className="border-border bg-secondary/50 text-foreground"
                    />
                  </div>
                  <div className="flex gap-2">
                    {[5, 10, 25, 50].map((amt) => (
                      <Button key={amt} variant="outline" size="sm" className="flex-1 border-border text-muted-foreground hover:text-foreground" onClick={() => setAddAmount(amt.toString())}>
                        ${amt}
                      </Button>
                    ))}
                  </div>
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/80 gap-2"
                    onClick={handleAddFunds}
                    disabled={submitting || !addAmount}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {submitting ? "Redirecting to Stripe..." : "Pay with Stripe"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Secured by Stripe. Your card details are never stored on our servers.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-lg border border-border/50 bg-card" data-tour="wallet-history">
        <div className="border-b border-border/50 p-4">
          <h3 className="font-arcade text-[10px] text-foreground">Transaction History</h3>
        </div>
        <div className="divide-y divide-border/30">
          {paginatedTx.map((tx) => {
            const config = txTypeConfig[tx.type] ?? { icon: DollarSign, label: tx.type, color: "text-muted-foreground" };
            const Icon = config.icon;
            const isCredit = tx.amount_cents > 0;
            const amountColor = tx.type === "admin_adjust" 
              ? (isCredit ? "text-primary text-glow-blue" : "text-accent") 
              : (isCredit ? "text-neon-green" : "text-accent");
              
            return (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <div>
                    <p className="text-sm text-foreground">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${amountColor}`}>
                    {isCredit ? "+" : "-"}${(Math.abs(tx.amount_cents) / 100).toFixed(2)}
                  </p>
                  <p className={`text-xs ${tx.status === "succeeded" ? "text-neon-green" : tx.status === "pending" ? "text-primary" : "text-destructive"}`}>
                    {tx.status}
                  </p>
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Wallet className="h-7 w-7 text-primary/40" />
              </div>
              <p className="font-arcade text-[11px] text-muted-foreground mb-1">No Transactions Yet</p>
              <p className="text-xs text-muted-foreground/70">Add funds to get started and join contests!</p>
            </div>
          )}
        </div>
        <TablePagination
          currentPage={txPage}
          totalPages={totalPages}
          onPageChange={setTxPage}
          totalItems={totalItems}
          pageSize={pageSize}
        />
      </div>

      <OnboardingTour steps={TOUR_STEPS} storageKey="tour-player-wallet" />
    </div>
  );
};

export default WalletPanel;
