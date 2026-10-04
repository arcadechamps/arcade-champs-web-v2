import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

const TWO_MINUTES_MS = 2 * 60 * 1000;
const queryDefaults = { staleTime: TWO_MINUTES_MS, refetchOnWindowFocus: false } as const;

export const SECURITY_LOGS_PAGE_SIZE = 20;
export const DORMANT_USERS_PAGE_SIZE = 25;

export type DormantFilter = "all" | "active" | "dormant" | "unverified" | "reverify";

export interface DormantSummary {
  total_users: number;
  confirmed: number;
  unverified: number;
  active: number;
  inactive: number;
  flagged_dormant: number;
  pending_reverification: number;
  reverified: number;
  logins_today: number;
  logins_30d: number;
  reminders_pending: number;
  reminders_sent_30d: number;
  detection_enabled: boolean;
  reminders_enabled: boolean;
  last_run: {
    ran_at: string;
    candidates: number;
    newly_flagged: number;
    cleared: number;
    reminders_queued: number;
  } | null;
  login_tracking_since: string | null;
}

export interface ReminderSettings {
  reminders_enabled: boolean;
  days_between: number;
  max_reminders: number;
  inactive_days: number;
  detection_enabled: boolean;
  updated_at: string | null;
}

export interface ReminderSettingsInput {
  reminders_enabled?: boolean;
  days_between?: number;
  max_reminders?: number;
}

export interface SendReminderResult {
  requested: number;
  queued: number;
  skipped: number;
}

export type SignupMetricRow = Database["public"]["Functions"]["admin_signup_metrics"]["Returns"][number];
export type SecurityLogRow = Database["public"]["Views"]["security_logs"]["Row"];
export type DormantUserRow = Database["public"]["Functions"]["admin_list_users"]["Returns"][number];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const useDormantSummary = () =>
  useQuery({
    queryKey: ["admin-security", "summary"],
    ...queryDefaults,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dormant_summary");
      if (error) throw error;
      return data as unknown as DormantSummary;
    },
  });

export const useSignupMetrics = (rangeDays: number) =>
  useQuery({
    queryKey: ["admin-security", "signup-metrics", rangeDays],
    ...queryDefaults,
    queryFn: async () => {
      const to = new Date();
      const from = new Date(to.getTime() - rangeDays * MS_PER_DAY);
      const { data, error } = await supabase.rpc("admin_signup_metrics", {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSecurityLogs = (page: number, blockedOnly: boolean) =>
  useQuery({
    queryKey: ["admin-security", "logs", page, blockedOnly],
    ...queryDefaults,
    queryFn: async () => {
      const from = page * SECURITY_LOGS_PAGE_SIZE;
      let query = supabase
        .from("security_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, from + SECURITY_LOGS_PAGE_SIZE - 1);
      if (blockedOnly) query = query.eq("blocked", true);
      const { data, count, error } = await query;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

export const useDormantUsers = (filter: DormantFilter, search: string, page: number) =>
  useQuery({
    queryKey: ["admin-security", "users", filter, search, page],
    ...queryDefaults,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", {
        p_filter: filter,
        p_search: search || undefined,
        p_limit: DORMANT_USERS_PAGE_SIZE,
        p_offset: page * DORMANT_USERS_PAGE_SIZE,
      });
      if (error) throw error;
      const rows = data ?? [];
      return { rows, total: rows[0]?.total_count ?? 0 };
    },
  });

export const useSendReminders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userIds: string[]) => {
      const { data, error } = await supabase.rpc("admin_send_reminder", { p_user_ids: userIds });
      if (error) throw error;
      return data as unknown as SendReminderResult;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-security"] }),
  });
};

export const useReminderSettings = () =>
  useQuery({
    queryKey: ["admin-security", "reminder-settings"],
    ...queryDefaults,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_reminder_settings");
      if (error) throw error;
      return data as unknown as ReminderSettings;
    },
  });

export const useSaveReminderSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReminderSettingsInput) => {
      const { data, error } = await supabase.rpc("admin_set_reminder_settings", {
        p_reminders_enabled: input.reminders_enabled,
        p_days_between: input.days_between,
        p_max_reminders: input.max_reminders,
      });
      if (error) throw error;
      return data as unknown as ReminderSettings;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-security"] }),
  });
};
