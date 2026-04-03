import { useState } from "react";
import { Users, Trophy, Zap, DollarSign, AlertTriangle, ArrowRight, TrendingUp, ArrowDownCircle, ArrowUpCircle, Crown, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Profile, Contest, GameSession, WalletTransaction, AntiCheatLog, Wallet, ContestWinner } from "@/types/database";
import OnboardingTour, { type TourStep } from "@/components/OnboardingTour";
import TablePagination, { usePagination } from "./TablePagination";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { exportToCSV } from "@/lib/utils";
import { toast } from "sonner";

const TOUR_STEPS: TourStep[] = [
  { targetSelector: '[data-tour="admin-stats"]', title: "Platform at a Glance", description: "Your top-level metrics — players, contests, sessions, and more. Keep an eye on growth!", position: "bottom" },
  { targetSelector: '[data-tour="admin-revenue"]', title: "Revenue Summary", description: "Track top-ups, session fees, payouts, and net revenue. The financial heartbeat of your platform.", position: "right" },
  { targetSelector: '[data-tour="admin-alerts"]', title: "Anti-Cheat Alerts", description: "Flagged sessions show up here. Click Review to jump straight to the Anti-Cheat panel and investigate.", position: "left" },
  { targetSelector: '[data-tour="admin-activity"]', title: "Recent Activity", description: "A live feed of signups, transactions, and winner declarations. Stay in the loop!", position: "top" },
  { targetSelector: '[data-tour="sidebar"]', title: "Navigate Sections", description: "Use the sidebar to jump between Contest Manager, Game Library, Player Directory, and more.", position: "right" },
];

interface AdminOverviewProps {
  profiles: Profile[];
  contests: Contest[];
  sessions: GameSession[];
  transactions?: WalletTransaction[];
  antiCheatLogs?: AntiCheatLog[];
  wallets?: Wallet[];
  winners?: ContestWinner[];
  onNavigate?: (section: string) => void;
}

const AdminOverview = ({ profiles, contests, sessions, transactions = [], antiCheatLogs = [], wallets = [], winners = [], onNavigate }: AdminOverviewProps) => {
  const totalPlayers = profiles.length;
  const activeContests = contests.filter(c => c.status === "active").length;

  const succeededTx = transactions.filter(t => t.status === "succeeded");
  const totalTopups = succeededTx.filter(t => t.type === "topup").reduce((s, t) => s + t.amount_cents, 0);
  const totalFees = succeededTx.filter(t => t.type === "session_fee").reduce((s, t) => s + t.amount_cents, 0);
  const totalPayouts = succeededTx.filter(t => t.type === "payout").reduce((s, t) => s + t.amount_cents, 0);
  const netRevenue = totalFees - totalPayouts;

  const flaggedLogs = antiCheatLogs.filter(l => l.status === "suspected" || l.status === "confirmed");
  const suspectedCount = antiCheatLogs.filter(l => l.status === "suspected").length;
  const confirmedCount = antiCheatLogs.filter(l => l.status === "confirmed").length;

  const totalBalance = wallets.reduce((s, w) => s + w.balance_cents, 0);

  const [timeRange, setTimeRange] = useState<"7d" | "4w" | "6m">("4w");

  const getChartData = () => {
    let buckets: { name: string; timestamp: number; Topups: number; Fees: number; Payouts: number; Net: number }[] = [];
    const now = new Date();

    if (timeRange === "7d") {
      const DAYS_TO_SHOW = 7;
      buckets = Array.from({ length: DAYS_TO_SHOW }).map((_, i) => {
        const d = subDays(now, DAYS_TO_SHOW - 1 - i);
        const dayStart = startOfDay(d);
        return { name: format(dayStart, "MMM d"), timestamp: dayStart.getTime(), Topups: 0, Fees: 0, Payouts: 0, Net: 0 };
      });
    } else if (timeRange === "4w") {
      const WEEKS_TO_SHOW = 4;
      buckets = Array.from({ length: WEEKS_TO_SHOW }).map((_, i) => {
        const d = subWeeks(now, WEEKS_TO_SHOW - 1 - i);
        const weekStart = startOfWeek(d, { weekStartsOn: 1 });
        return { name: format(weekStart, "MMM d"), timestamp: weekStart.getTime(), Topups: 0, Fees: 0, Payouts: 0, Net: 0 };
      });
    } else if (timeRange === "6m") {
      const MONTHS_TO_SHOW = 6;
      buckets = Array.from({ length: MONTHS_TO_SHOW }).map((_, i) => {
        const d = subMonths(now, MONTHS_TO_SHOW - 1 - i);
        const monthStart = startOfMonth(d);
        return { name: format(monthStart, "MMM yy"), timestamp: monthStart.getTime(), Topups: 0, Fees: 0, Payouts: 0, Net: 0 };
      });
    }

    succeededTx.forEach(tx => {
      const txDate = new Date(tx.created_at);
      let txBucketTime = 0;
      if (timeRange === "7d") txBucketTime = startOfDay(txDate).getTime();
      else if (timeRange === "4w") txBucketTime = startOfWeek(txDate, { weekStartsOn: 1 }).getTime();
      else if (timeRange === "6m") txBucketTime = startOfMonth(txDate).getTime();

      const bucket = buckets.find(w => w.timestamp === txBucketTime);
      if (bucket) {
        const amount = tx.amount_cents / 100;
        if (tx.type === "topup") bucket.Topups += amount;
        if (tx.type === "session_fee") bucket.Fees += amount;
        if (tx.type === "payout") bucket.Payouts += amount;
      }
    });

    buckets.forEach(w => {
      w.Net = w.Fees - w.Payouts;
    });

    return buckets;
  };

  const chartData = getChartData();

  const handleExportChartData = () => {
    if (chartData.length === 0) return;
    exportToCSV(`revenue-summary-${timeRange}`, chartData, [
      { header: "Period", accessor: (d) => d.name },
      { header: "Top-ups ($)", accessor: (d) => d.Topups.toFixed(2) },
      { header: "Session Fees ($)", accessor: (d) => d.Fees.toFixed(2) },
      { header: "Payouts ($)", accessor: (d) => d.Payouts.toFixed(2) },
      { header: "Net Revenue ($)", accessor: (d) => d.Net.toFixed(2) },
    ]);
    toast.success(`Exported ${timeRange.toUpperCase()} chart data`);
  };

  const stats = [
    { label: "Total Players", value: totalPlayers, icon: Users, color: "text-primary" },
    { label: "Total Contests", value: contests.length, icon: Trophy, color: "text-neon-pink" },
    { label: "Active Contests", value: activeContests, icon: Zap, color: "text-neon-green" },
    { label: "Total Sessions", value: sessions.length, icon: DollarSign, color: "text-accent" },
  ];

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  type ActivityItem = { id: string; type: string; label: string; detail: string; time: string; color: string };
  const recentActivity: ActivityItem[] = [];

  for (const p of profiles) {
    recentActivity.push({
      id: `p-${p.user_id}`, type: "signup", label: "New Player",
      detail: p.display_name ?? p.username ?? "Unknown", time: p.created_at, color: "text-primary",
    });
  }

  for (const tx of transactions) {
    recentActivity.push({
      id: `tx-${tx.id}`, type: "transaction", label: tx.type.replace("_", " "),
      detail: `$${(tx.amount_cents / 100).toFixed(2)}`, time: tx.created_at,
      color: tx.type === "topup" ? "text-neon-green" : tx.type === "session_fee" ? "text-accent" : "text-primary",
    });
  }

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.display_name ?? uid.slice(0, 8);
  const getContestTitle = (cid: string) => contests.find(c => c.id === cid)?.title ?? "Unknown";
  for (const w of winners) {
    recentActivity.push({
      id: `w-${w.contest_id}`, type: "winner", label: "Winner Declared",
      detail: `${getName(w.user_id)} won ${getContestTitle(w.contest_id)} — $${(w.payout_cents / 100).toFixed(2)}`,
      time: w.declared_at, color: "text-neon-pink",
    });
  }

  recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  
  const [activityPage, setActivityPage] = useState(1);
  const { totalPages, totalItems, pageSize, getPage } = usePagination(recentActivity, 8);
  const paginatedActivity = getPage(activityPage);

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4" data-tour="admin-stats">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg bg-secondary/50 p-2 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Summary */}
        <Card className="border-border/50 bg-card" data-tour="admin-revenue">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-arcade text-[10px] text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-neon-green" /> Revenue Summary
            </CardTitle>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex bg-secondary/50 rounded-md p-0.5 sm:p-1">
                <button onClick={() => setTimeRange("7d")} className={`px-1.5 sm:px-2 py-1 text-[10px] rounded ${timeRange === "7d" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>7D</button>
                <button onClick={() => setTimeRange("4w")} className={`px-1.5 sm:px-2 py-1 text-[10px] rounded ${timeRange === "4w" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>4W</button>
                <button onClick={() => setTimeRange("6m")} className={`px-1.5 sm:px-2 py-1 text-[10px] rounded ${timeRange === "6m" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>6M</button>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Export CSV" onClick={handleExportChartData}>
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] sm:text-xs text-primary hover:text-black hidden sm:flex" onClick={() => onNavigate?.("sessions")}>
                Ledger <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-secondary/30 p-2 lg:p-3">
                <span className="text-[10px] text-muted-foreground block mb-1">Top-ups</span>
                <p className="font-arcade text-xs text-neon-green truncate">${(totalTopups / 100).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-2 lg:p-3">
                <span className="text-[10px] text-muted-foreground block mb-1">Fees</span>
                <p className="font-arcade text-xs text-accent truncate">${(totalFees / 100).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-2 lg:p-3">
                <span className="text-[10px] text-muted-foreground block mb-1">Payouts</span>
                <p className="font-arcade text-xs text-primary truncate">${(totalPayouts / 100).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-2 lg:p-3">
                <span className="text-[10px] text-muted-foreground block mb-1">Net Rev</span>
                <p className={`font-arcade text-xs truncate ${netRevenue >= 0 ? "text-neon-green" : "text-destructive"}`}>
                  ${(netRevenue / 100).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }}
                    itemStyle={{ fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey="Topups" stackId="a" fill="hsl(var(--neon-green))" opacity={0.6} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Fees" stackId="a" fill="hsl(var(--accent))" opacity={0.6} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Net" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--card))" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-border/30 pt-3 mt-4">
              <span className="text-muted-foreground">Platform Balance (all wallets)</span>
              <span className="text-foreground font-medium">${(totalBalance / 100).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Flagged Sessions Alert */}
        <Card className={`border-border/50 bg-card ${flaggedLogs.length > 0 ? "border-destructive/30" : ""}`} data-tour="admin-alerts">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-arcade text-[10px] text-foreground flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${flaggedLogs.length > 0 ? "text-destructive" : "text-muted-foreground"}`} /> Anti-Cheat Alerts
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-black" onClick={() => onNavigate?.("anticheat")}>
              Review <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-secondary/50 p-4 text-center">
                <p className={`font-arcade text-lg ${suspectedCount > 0 ? "text-accent" : "text-muted-foreground"}`}>{suspectedCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Suspected</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-4 text-center">
                <p className={`font-arcade text-lg ${confirmedCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>{confirmedCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Confirmed</p>
              </div>
            </div>
            {flaggedLogs.length > 0 ? (
              <div className="space-y-2">
                {flaggedLogs.slice(0, 3).map(log => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-xs">
                    <span className={log.status === "confirmed" ? "text-destructive" : "text-accent"}>
                      {log.status}
                    </span>
                    <span className="text-muted-foreground">{log.reason ?? "No reason"}</span>
                    <span className="text-muted-foreground">{timeAgo(log.created_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-2">All clear — no flagged sessions.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card className="border-border/50 bg-card" data-tour="admin-activity">
        <CardHeader className="pb-2">
          <CardTitle className="font-arcade text-[10px] text-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-6 pt-0">
            {paginatedActivity.length > 0 ? (
              <div className="space-y-2">
                {paginatedActivity.map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
                    <div>
                      <p className={`text-sm font-medium capitalize ${item.color}`}>{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{timeAgo(item.time)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No recent activity.</p>
            )}
          </div>
          {totalPages > 1 && (
            <TablePagination
              currentPage={activityPage}
              totalPages={totalPages}
              onPageChange={setActivityPage}
              totalItems={totalItems}
              pageSize={pageSize}
            />
          )}
        </CardContent>
      </Card>

      <OnboardingTour steps={TOUR_STEPS} storageKey="tour-admin-overview" />
    </div>
  );
};

export default AdminOverview;
