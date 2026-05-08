import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useOutletContext, Outlet } from "react-router-dom";
import Layout from "@/components/Layout";
import { Shield, Loader2, Menu } from "lucide-react";
import PlayerOverview from "@/components/dashboard/PlayerOverview";
import WalletPanel from "@/components/dashboard/WalletPanel";
import PlayerContests from "@/components/dashboard/PlayerContests";
import SessionHistory from "@/components/dashboard/SessionHistory";
import AdminContestManager from "@/components/dashboard/AdminContestManager";
import AdminGameManager from "@/components/dashboard/AdminGameManager";
import AdminOverview from "@/components/dashboard/AdminOverview";
import AdminPlayerList from "@/components/dashboard/AdminPlayerList";
import AdminAntiCheat from "@/components/dashboard/AdminAntiCheat";
import AdminNewsletterSubscribers from "@/components/dashboard/AdminNewsletterSubscribers";
import Leaderboard from "@/components/dashboard/Leaderboard";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import AdminSessions from "@/components/dashboard/AdminSessions";
import AdminLeaderboard from "@/components/dashboard/AdminLeaderboard";
import AdminEmailManager from "@/components/dashboard/AdminEmailManager";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardFreeGames from "@/components/dashboard/DashboardFreeGames";
import DashboardContestGames from "@/components/dashboard/DashboardContestGames";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";

const SIDEBAR_STORAGE_KEY = "dashboard-sidebar-open";

// ── Outlet context type ────────────────────────────────────────────
export interface DashboardOutletContext {
  wallet: ReturnType<typeof useDashboardData>["wallet"];
  transactions: ReturnType<typeof useDashboardData>["transactions"];
  contests: ReturnType<typeof useDashboardData>["contests"];
  games: ReturnType<typeof useDashboardData>["games"];
  sessions: ReturnType<typeof useDashboardData>["sessions"];
  winners: ReturnType<typeof useDashboardData>["winners"];
  profiles: ReturnType<typeof useDashboardData>["profiles"];
  wallets: ReturnType<typeof useDashboardData>["wallets"];
  participants: ReturnType<typeof useDashboardData>["participants"];
  antiCheatLogs: ReturnType<typeof useDashboardData>["antiCheatLogs"];
  refetch: ReturnType<typeof useDashboardData>["refetch"];
}

/** Hook for child route components to access shared dashboard data */
export function useDashboardContext() {
  return useOutletContext<DashboardOutletContext>();
}

// ── Shared shell that wraps every dashboard child route ────────────
const DashboardShell = ({ isAdmin }: { isAdmin: boolean }) => {
  const { profile } = useAuth();
  const dashboardData = useDashboardData();
  const { isMobile, toggleSidebar } = useSidebar();
  const location = useLocation();

  // Derive active section from the current URL for sidebar highlighting
  const pathSegments = location.pathname.replace("/dashboard", "").split("/").filter(Boolean);
  // For admin: /dashboard/admin/contests → activeSection = "contests"
  // For player: /dashboard/wallet → activeSection = "wallet"
  const activeSection = isAdmin
    ? (pathSegments[1] ?? "overview") // skip "admin" prefix
    : (pathSegments[0] ?? "home");

  if (dashboardData.loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const outletContext: DashboardOutletContext = {
    wallet: dashboardData.wallet,
    transactions: dashboardData.transactions,
    contests: dashboardData.contests,
    games: dashboardData.games,
    sessions: dashboardData.sessions,
    winners: dashboardData.winners,
    profiles: dashboardData.profiles,
    wallets: dashboardData.wallets,
    participants: dashboardData.participants,
    antiCheatLogs: dashboardData.antiCheatLogs,
    refetch: dashboardData.refetch,
  };

  return (
    <>
      <DashboardSidebar
        isAdmin={isAdmin}
        activeSection={activeSection}
      />
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6">
          <div className="mb-6 flex items-center gap-3">
            {isMobile && (
              <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={toggleSidebar}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1">
              <h1 className="font-arcade text-lg text-foreground md:text-xl">
                <span className="text-primary text-glow-blue">Dashboard</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Welcome back, <span className="text-foreground">{profile?.display_name ?? profile?.username ?? "Player"}</span>
                {isAdmin && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded bg-primary/20 px-2 py-0.5 text-xs text-primary">
                    <Shield className="h-3 w-3" /> Admin
                  </span>
                )}
              </p>
            </div>
          </div>
          <Outlet context={outletContext} />
        </div>
      </div>
    </>
  );
};

// ── Player route pages (thin wrappers that pull from context) ──────
const PlayerHomePage = () => {
  const { sessions, contests, wallet, transactions, games, winners } = useDashboardContext();
  return <PlayerOverview sessions={sessions} contests={contests} wallet={wallet} transactions={transactions} games={games} winners={winners} />;
};

const PlayerFreeGamesPage = () => {
  const { games } = useDashboardContext();
  return <DashboardFreeGames games={games} />;
};

const PlayerContestGamesPage = () => {
  return <DashboardContestGames />;
};

const PlayerContestsPage = () => {
  const { contests, sessions, winners, profiles } = useDashboardContext();
  return <PlayerContests contests={contests} sessions={sessions} winners={winners} profiles={profiles} />;
};

const PlayerWalletPage = () => {
  const { wallet, transactions, refetch } = useDashboardContext();
  const defaultWallet = wallet ?? { user_id: "", balance_cents: 0, updated_at: "" };
  return <WalletPanel wallet={defaultWallet} transactions={transactions} onRefetch={refetch} />;
};

const PlayerSessionsPage = () => {
  const { sessions, games, contests } = useDashboardContext();
  return <SessionHistory sessions={sessions} games={games} contests={contests} />;
};

const PlayerLeaderboardsPage = () => {
  const { sessions, contests, games, profiles, winners } = useDashboardContext();
  return <Leaderboard sessions={sessions} contests={contests} games={games} profiles={profiles} winners={winners} />;
};

const PlayerProfilePage = () => {
  return <ProfileSettings />;
};

// ── Admin route pages (thin wrappers) ──────────────────────────────
const AdminOverviewPage = () => {
  const { profiles, contests, sessions, transactions, antiCheatLogs, wallets, winners } = useDashboardContext();
  return <AdminOverview profiles={profiles} contests={contests} sessions={sessions} transactions={transactions} antiCheatLogs={antiCheatLogs} wallets={wallets} winners={winners} />;
};

const AdminContestsPage = () => {
  const { contests, games, winners, participants, profiles, sessions, antiCheatLogs, refetch } = useDashboardContext();
  return <AdminContestManager contests={contests} games={games} winners={winners} participants={participants} profiles={profiles} sessions={sessions} antiCheatLogs={antiCheatLogs} onRefetch={refetch} />;
};

const AdminGamesPage = () => {
  const { games, refetch } = useDashboardContext();
  return <AdminGameManager games={games} onRefetch={refetch} />;
};

const AdminPlayersPage = () => {
  const { profiles, wallets, transactions, refetch } = useDashboardContext();
  return <AdminPlayerList profiles={profiles} wallets={wallets} transactions={transactions} onRefetch={refetch} />;
};

const AdminAntiCheatPage = () => {
  const { antiCheatLogs, profiles, games, contests, refetch } = useDashboardContext();
  return <AdminAntiCheat logs={antiCheatLogs} profiles={profiles} games={games} contests={contests} onRefetch={refetch} />;
};

const AdminSessionsPage = () => {
  const { sessions, games, contests, profiles } = useDashboardContext();
  return <AdminSessions sessions={sessions} games={games} contests={contests} profiles={profiles} />;
};

const AdminLeaderboardsPage = () => {
  const { contests, games, antiCheatLogs, winners } = useDashboardContext();
  return <AdminLeaderboard contests={contests} games={games} logs={antiCheatLogs} winners={winners} />;
};

const AdminNewsletterPage = () => {
  return <AdminNewsletterSubscribers />;
};

const AdminEmailsPage = () => {
  return <AdminEmailManager />;
};

// ── Root dashboard component ───────────────────────────────────────
const Dashboard = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin ?? false;

  // Persist sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored !== null ? stored === "true" : true;
  });

  const handleSidebarChange = (open: boolean) => {
    setSidebarOpen(open);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
  };

  return (
    <Layout>
      <PageMeta title={isAdmin ? "Admin Dashboard" : "Player Dashboard"} description="Manage your Arcade Champs account, view history, and join contests." />
      <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarChange}>
        <div className="flex w-full min-h-[calc(100vh-4rem)]">
          <Routes>
            {/* Admin nested routes */}
            <Route path="admin" element={<DashboardShell isAdmin={true} />}>
              <Route index element={<AdminOverviewPage />} />
              <Route path="contests" element={<AdminContestsPage />} />
              <Route path="games" element={<AdminGamesPage />} />
              <Route path="players" element={<AdminPlayersPage />} />
              <Route path="anticheat" element={<AdminAntiCheatPage />} />
              <Route path="sessions" element={<AdminSessionsPage />} />
              <Route path="leaderboards" element={<AdminLeaderboardsPage />} />
              <Route path="newsletter" element={<AdminNewsletterPage />} />
              <Route path="emails" element={<AdminEmailsPage />} />
            </Route>

            {/* Player nested routes */}
            <Route path="" element={isAdmin ? <Navigate to="admin" replace /> : <DashboardShell isAdmin={false} />}>
              {!isAdmin && (
                <>
                  <Route index element={<PlayerHomePage />} />
                  <Route path="free-games" element={<PlayerFreeGamesPage />} />
                  <Route path="contest-games" element={<PlayerContestGamesPage />} />
                  <Route path="contests" element={<PlayerContestsPage />} />
                  <Route path="wallet" element={<PlayerWalletPage />} />
                  <Route path="sessions" element={<PlayerSessionsPage />} />
                  <Route path="leaderboards" element={<PlayerLeaderboardsPage />} />
                  <Route path="profile" element={<PlayerProfilePage />} />
                </>
              )}
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to={isAdmin ? "admin" : ""} replace />} />
          </Routes>
        </div>
      </SidebarProvider>
    </Layout>
  );
};

export default Dashboard;
