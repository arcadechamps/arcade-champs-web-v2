import { Trophy, Gamepad2, Clock, Wallet, Flame, ArrowRight, Calendar, Crown, Gift, MapPin, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GameSession, Contest, Wallet as WalletType, WalletTransaction, Game, ContestWinner } from "@/types/database";
import { useAuth } from "@/hooks/useAuth";
import OnboardingTour, { type TourStep } from "@/components/OnboardingTour";

const TOUR_STEPS: TourStep[] = [
  { targetSelector: '[data-tour="home-wallet"]', title: "Your Wallet at a Glance", description: "Keep tabs on your balance and recent transactions without leaving the dashboard. Top up anytime to join contests!", position: "bottom" },
  { targetSelector: '[data-tour="home-performance"]', title: "Your Performance Stats", description: "Track your wins, streaks, and total earnings. Watch these numbers climb as you dominate the leaderboards!", position: "bottom" },
  { targetSelector: '[data-tour="home-contests"]', title: "Active Contests", description: "Jump into live contests right from here. Entry fees, time limits, and more — all at a glance.", position: "top" },
  { targetSelector: '[data-tour="home-sessions"]', title: "Recent Sessions", description: "Review your latest game sessions and scores. Every session counts toward your ranking!", position: "top" },
];

interface PlayerOverviewProps {
  sessions: GameSession[];
  contests: Contest[];
  wallet?: WalletType | null;
  transactions?: WalletTransaction[];
  games?: Game[];
  winners?: ContestWinner[];

}

const PlayerOverview = ({ sessions, contests, wallet, transactions = [], games = [], winners = [] }: PlayerOverviewProps) => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  
  const [shippingAddress, setShippingAddress] = useState("");
  const [isSubmittingShipping, setIsSubmittingShipping] = useState(false);

  useEffect(() => {
    if (profile?.shipping_address) {
      setShippingAddress(profile.shipping_address);
    }
  }, [profile?.shipping_address]);

  const totalGames = sessions.length;
  const bestScore = sessions.length > 0 ? Math.max(...sessions.map(s => s.score ?? 0)) : 0;
  const activeContests = contests.filter(c => c.status === "active");
  const activeContestCount = activeContests.length;
  const myWins = winners.filter(w => w.user_id === user?.id);
  const totalEarnings = myWins.reduce((sum, w) => sum + w.payout_cents, 0);

  const pendingWins = myWins.filter(w => (w as any).fulfillment_status === "pending" || (w as any).fulfillment_status === "processing");
  const needsShippingInfo = pendingWins.length > 0 && !profile?.shipping_address;

  const handleUpdateShipping = async () => {
    if (!user) return;
    if (!shippingAddress.trim()) {
      toast.error("Please enter a valid shipping address");
      return;
    }
    
    setIsSubmittingShipping(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ shipping_address: shippingAddress })
        .eq("user_id", user.id);
        
      if (error) throw error;
      toast.success("Shipping address saved!", { description: "We will use this address to fulfill your prizes." });
      await refreshProfile();
    } catch (err: any) {
      toast.error("Failed to update shipping address", { description: err.message });
    } finally {
      setIsSubmittingShipping(false);
    }
  };

  const sortedSessions = [...sessions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  let winStreak = 0;
  for (const s of sortedSessions) {
    if ((s.score ?? 0) > 0) winStreak++;
    else break;
  }
  const totalWins = sessions.filter(s => (s.score ?? 0) > 0).length;

  const gameMap = new Map(games.map(g => [g.id, g.title]));
  const contestMap = new Map(contests.map(c => [c.id, c.title]));

  const stats = [
    { icon: Trophy, label: "Best Score", value: bestScore.toLocaleString(), color: "text-neon-pink" },
    { icon: Gamepad2, label: "Games Played", value: totalGames.toString(), color: "text-primary" },
    { icon: Clock, label: "Active Contests", value: activeContestCount.toString(), color: "text-accent" },
    { icon: Crown, label: "Contest Wins", value: myWins.length.toString(), color: "text-neon-pink" },
  ];

  const recentSessions = sortedSessions.slice(0, 5);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const timeLeft = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ${mins % 60}m`;
    const days = Math.floor(hrs / 24);
    return `${days}d ${hrs % 24}h`;
  };

  return (
    <div className="space-y-6">
      {/* Unclaimed / Pending Prizes Banner */}
      {pendingWins.length > 0 && (
        <Card className="border-neon-pink/50 bg-neon-pink/5 shadow-[0_0_15px_rgba(255,42,133,0.1)]">
          <CardHeader className="pb-2">
            <CardTitle className="font-arcade text-sm text-neon-pink flex items-center gap-2">
              <Gift className="h-5 w-5" /> You Have Pending Prizes!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {pendingWins.map(w => {
                const c = contests.find(c => c.id === w.contest_id);
                const prizeDesc = (c as any)?.prize_description || `$${(w.payout_cents / 100).toFixed(2)}`;
                return (
                  <div key={w.contest_id} className="flex items-center justify-between text-sm p-3 rounded bg-background/50 border border-border/50 transition-all hover:border-neon-pink/30">
                    <div>
                      <p className="font-medium text-foreground">{c?.title ?? "Contest"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Crown className="h-3 w-3 text-neon-pink" /> Won: <span className="text-neon-pink">{prizeDesc}</span>
                      </p>
                    </div>
                    <Badge variant="outline" className={`capitalize ${(w as any).fulfillment_status === 'processing' ? 'text-accent border-accent/50 bg-accent/10' : 'text-primary border-primary/50 bg-primary/10'}`}>
                      {(w as any).fulfillment_status || 'pending'}
                    </Badge>
                  </div>
                );
              })}
            </div>
            
            {needsShippingInfo ? (
              <div className="pt-2 border-t border-neon-pink/20">
                <p className="text-sm text-muted-foreground mb-3 font-medium">Please provide your shipping address to claim your physical prizes:</p>
                <div className="flex items-start gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Full Name, Street Address, City, State ZIP" 
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="pl-9 bg-background/50 focus-visible:ring-neon-pink h-9 text-xs"
                    />
                  </div>
                  <Button 
                    onClick={handleUpdateShipping} 
                    disabled={isSubmittingShipping || !shippingAddress.trim()} 
                    className="h-9 bg-neon-pink text-white hover:bg-neon-pink/80 w-24 shrink-0 transition-all font-arcade text-[10px]"
                  >
                    {isSubmittingShipping ? "Saving..." : "Submit"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-neon-pink/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Your prizes will be shipped to: <span className="text-foreground pl-1">{profile?.shipping_address}</span>
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs border-primary text-primary hover:bg-primary/10 transition-colors"
                  onClick={() => navigate("/dashboard/profile")}
                >
                  Edit Address
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-lg border border-border/50 bg-card p-5 transition-all hover:neon-border">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className={`font-arcade text-sm ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Wallet Balance Card */}
        <Card className="border-border/50 bg-card" data-tour="home-wallet">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-arcade text-[10px] text-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-neon-green" /> My Wallet
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-white" onClick={() => navigate("/dashboard/wallet")}>
              View <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="font-arcade text-lg text-neon-green text-glow-blue mb-3">
              ${((wallet?.balance_cents ?? 0) / 100).toFixed(2)}
            </p>
            {transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.slice(0, 3).map(tx => {
                  const isCredit = tx.amount_cents > 0;
                  const amountColor = tx.type === "admin_adjust" 
                    ? (isCredit ? "text-primary text-glow-blue" : "text-accent") 
                    : (isCredit ? "text-neon-green" : "text-accent");

                  return (
                    <div key={tx.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground capitalize">
                        {tx.type === "admin_adjust" ? "Arcade Champs Transaction" : tx.type.replace("_", " ")}
                      </span>
                      <span className={amountColor}>
                        {isCredit ? "+" : "-"}${(Math.abs(tx.amount_cents) / 100).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No transactions yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Win/Loss Stats */}
        <Card className="border-border/50 bg-card" data-tour="home-performance">
          <CardHeader className="pb-2">
            <CardTitle className="font-arcade text-[10px] text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-neon-pink" /> Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-secondary/50 p-4 text-center">
                <p className="font-arcade text-lg text-neon-green">{totalWins}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Wins</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-4 text-center">
                <p className="font-arcade text-lg text-neon-pink">{myWins.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Contests Won</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-4 text-center">
                <p className="font-arcade text-lg text-neon-green">${(totalEarnings / 100).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Earnings</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Win Rate</span>
              <span className="text-foreground font-medium">
                {totalGames > 0 ? `${Math.round((totalWins / totalGames) * 100)}%` : "N/A"}
              </span>
            </div>
            {myWins.length > 0 && (
              <div className="border-t border-border/30 pt-3 space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Recent Wins</p>
                {myWins.slice(0, 3).map(w => {
                  const c = contests.find(c => c.id === w.contest_id);
                  return (
                    <div key={w.contest_id} className="flex items-center justify-between text-xs rounded-lg bg-neon-pink/5 px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        <Crown className="h-3 w-3 text-neon-pink" />
                        <span className="text-foreground">{c?.title ?? "Contest"}</span>
                      </span>
                      <span className="text-neon-green font-arcade text-[10px]">${(w.payout_cents / 100).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Contests to Join */}
      <Card className="border-border/50 bg-card" data-tour="home-contests">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-arcade text-[10px] text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" /> Active Contests
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-white" onClick={() => navigate("/dashboard/contests")}>
            Browse All <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {activeContests.length > 0 ? (
            <div className="space-y-3">
              {activeContests.slice(0, 4).map(c => (
                <div key={c.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Fee: ${(c.session_fee_cents / 100).toFixed(2)} · {Math.floor(c.session_duration_seconds / 60)}min
                    </p>
                  </div>
                  {c.ends_at && (
                    <span className="text-xs text-accent">{timeLeft(c.ends_at)} left</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No active contests right now.</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card className="border-border/50 bg-card" data-tour="home-sessions">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-arcade text-[10px] text-foreground flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-primary" /> Recent Sessions
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-white" onClick={() => navigate("/dashboard/sessions")}>
            View All <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentSessions.length > 0 ? (
            <div className="space-y-2">
              {recentSessions.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm text-foreground">{gameMap.get(s.game_id) ?? "Unknown Game"}</p>
                      <p className="text-xs text-muted-foreground">{contestMap.get(s.contest_id) ?? "—"} · {timeAgo(s.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-arcade text-xs text-neon-pink">{(s.score ?? 0).toLocaleString()}</p>
                    <p className={`text-xs ${s.status === "ended" ? "text-muted-foreground" : s.status === "flagged" ? "text-destructive" : "text-neon-green"}`}>
                      {s.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No sessions yet. Join a contest to start playing!</p>
          )}
        </CardContent>
      </Card>

      <OnboardingTour steps={TOUR_STEPS} storageKey="tour-player-home" />
    </div>
  );
};

export default PlayerOverview;
