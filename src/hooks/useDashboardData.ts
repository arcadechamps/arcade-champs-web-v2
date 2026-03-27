import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Game, Contest, GameSession, Wallet, WalletTransaction, ContestWinner, Profile, ContestParticipant, AntiCheatLog } from "@/types/database";
import { useCallback } from "react";

interface DashboardData {
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  contests: Contest[];
  games: Game[];
  sessions: GameSession[];
  winners: ContestWinner[];
  profiles: Profile[];
  wallets: Wallet[];
  participants: ContestParticipant[];
  antiCheatLogs: AntiCheatLog[];
}

const emptyData: DashboardData = {
  wallet: null,
  transactions: [],
  contests: [],
  games: [],
  sessions: [],
  winners: [],
  profiles: [],
  wallets: [],
  participants: [],
  antiCheatLogs: [],
};

async function fetchDashboardData(userId: string, isAdmin: boolean): Promise<DashboardData> {
  // Fire-and-forget: sync contest statuses in the DB before fetching
  supabase.functions.invoke("update-contest-statuses").catch(() => {});

  const baseQueries = [
    supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
    isAdmin
      ? supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(500)
      : supabase.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("contests").select("*").order("created_at", { ascending: false }),
    supabase.from("games").select("*").order("title"),
    isAdmin
      ? supabase.from("game_sessions").select("*").order("created_at", { ascending: false }).limit(500)
      : supabase.from("game_sessions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("contest_winners").select("*"),
  ];

  const adminQueries = isAdmin
    ? [
        supabase.from("profiles").select("*"),
        supabase.from("wallets").select("*"),
        supabase.from("contest_participants").select("*"),
        supabase.from("anti_cheat_logs").select("*").order("created_at", { ascending: false }),
      ]
    : [];

  const results = await Promise.all([...baseQueries, ...adminQueries]);

  const [walletRes, txRes, contestsRes, gamesRes, sessionsRes, winnersRes] = results;

  const data: DashboardData = {
    wallet: (walletRes.data as unknown as Wallet) ?? null,
    transactions: (txRes.data as unknown as WalletTransaction[]) ?? [],
    contests: (contestsRes.data as unknown as Contest[]) ?? [],
    games: (gamesRes.data as unknown as Game[]) ?? [],
    sessions: (sessionsRes.data as unknown as GameSession[]) ?? [],
    winners: (winnersRes.data as unknown as ContestWinner[]) ?? [],
    profiles: [],
    wallets: [],
    participants: [],
    antiCheatLogs: [],
  };

  if (isAdmin && results.length > 6) {
    const [profilesRes, walletsRes, participantsRes, antiCheatRes] = results.slice(6);
    data.profiles = (profilesRes.data as unknown as Profile[]) ?? [];
    data.wallets = (walletsRes.data as unknown as Wallet[]) ?? [];
    data.participants = (participantsRes.data as unknown as ContestParticipant[]) ?? [];
    data.antiCheatLogs = (antiCheatRes.data as unknown as AntiCheatLog[]) ?? [];
  } else {
    // For non-admin users, fetch profiles for all users who appear in sessions
    // so the leaderboard can display proper names
    const sessionUserIds = [...new Set(data.sessions.map(s => s.user_id))];
    if (sessionUserIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, created_at")
        .in("user_id", sessionUserIds);
      data.profiles = (profilesData as unknown as Profile[]) ?? [];
    }
  }

  return data;
}

export function useDashboardData() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin ?? false;
  const queryClient = useQueryClient();

  const { data = emptyData, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id, isAdmin],
    queryFn: () => fetchDashboardData(user!.id, isAdmin),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Re-fetch every 60s so status badges update at time boundaries
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dashboard", user?.id, isAdmin] });
  }, [queryClient, user?.id, isAdmin]);

  return {
    wallet: data.wallet,
    transactions: data.transactions,
    contests: data.contests,
    games: data.games,
    sessions: data.sessions,
    winners: data.winners,
    profiles: data.profiles,
    wallets: data.wallets,
    participants: data.participants,
    antiCheatLogs: data.antiCheatLogs,
    loading: isLoading,
    refetch,
  };
}
