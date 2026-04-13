import { useState, useEffect } from "react";
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
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardFreeGames from "@/components/dashboard/DashboardFreeGames";
import DashboardContestGames from "@/components/dashboard/DashboardContestGames";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";

const SIDEBAR_STORAGE_KEY = "dashboard-sidebar-open";

const DashboardContent = ({
  isAdmin,
  activeSection,
  onNavigate,
}: {
  isAdmin: boolean;
  activeSection: string;
  onNavigate: (section: string) => void;
}) => {
  const { profile } = useAuth();
  const { wallet, transactions, contests, games, sessions, winners, profiles, wallets, participants, antiCheatLogs, loading, refetch } = useDashboardData();
  const defaultWallet = wallet ?? { user_id: "", balance_cents: 0, updated_at: "" };
  const { isMobile, toggleSidebar } = useSidebar();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderContent = () => {
    if (isAdmin) {
      switch (activeSection) {
        case "overview":
          return <AdminOverview profiles={profiles} contests={contests} sessions={sessions} transactions={transactions} antiCheatLogs={antiCheatLogs} wallets={wallets} winners={winners} onNavigate={onNavigate} />;
        case "contests":
          return <AdminContestManager contests={contests} games={games} winners={winners} participants={participants} profiles={profiles} sessions={sessions} antiCheatLogs={antiCheatLogs} onRefetch={refetch} />;
        case "games":
          return <AdminGameManager games={games} onRefetch={refetch} />;
        case "players":
          return <AdminPlayerList profiles={profiles} wallets={wallets} transactions={transactions} onRefetch={refetch} />;
        case "anticheat":
          return <AdminAntiCheat logs={antiCheatLogs} profiles={profiles} games={games} contests={contests} onRefetch={refetch} />;
        case "sessions":
          return <AdminSessions sessions={sessions} games={games} contests={contests} profiles={profiles} />;
        case "leaderboards":
          return <AdminLeaderboard contests={contests} games={games} logs={antiCheatLogs} winners={winners} />;
        case "newsletter":
          return <AdminNewsletterSubscribers />;
        default:
          return <AdminOverview profiles={profiles} contests={contests} sessions={sessions} transactions={transactions} antiCheatLogs={antiCheatLogs} wallets={wallets} winners={winners} onNavigate={onNavigate} />;
      }
    } else {
      switch (activeSection) {
        case "home":
          return <PlayerOverview sessions={sessions} contests={contests} wallet={wallet} transactions={transactions} games={games} winners={winners} onNavigate={onNavigate} />;
        case "free-games":
          return <DashboardFreeGames games={games} />;
        case "contest-games":
          return <DashboardContestGames />;
        case "contests":
          return <PlayerContests contests={contests} sessions={sessions} winners={winners} profiles={profiles} />;
        case "wallet":
          return <WalletPanel wallet={defaultWallet} transactions={transactions} onRefetch={refetch} />;
        case "sessions":
          return <SessionHistory sessions={sessions} games={games} contests={contests} />;
        case "leaderboards":
          return <Leaderboard sessions={sessions} contests={contests} games={games} profiles={profiles} winners={winners} />;
        case "profile":
          return <ProfileSettings />;
        default:
          return <PlayerOverview sessions={sessions} contests={contests} wallet={wallet} transactions={transactions} games={games} onNavigate={onNavigate} />;
      }
    }
  };

  return (
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
        {renderContent()}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin ?? false;
  const [activeSection, setActiveSection] = useState(() =>
    isAdmin ? "overview" : "home"
  );

  // Update default section when isAdmin changes (e.g. profile loads)
  useEffect(() => {
    setActiveSection(isAdmin ? "overview" : "home");
  }, [isAdmin]);

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
          <DashboardSidebar
            isAdmin={isAdmin}
            activeSection={activeSection}
            onSelect={setActiveSection}
          />
          <DashboardContent isAdmin={isAdmin} activeSection={activeSection} onNavigate={setActiveSection} />
        </div>
      </SidebarProvider>
    </Layout>
  );
};

export default Dashboard;
