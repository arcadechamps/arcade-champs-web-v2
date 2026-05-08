import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export interface AdminEmail {
  id: string;
  direction: "inbound" | "outbound";
  from_email: string;
  to_email: string;
  subject: string;
  body_text: string;
  body_html: string;
  read: boolean;
  created_at: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  message: string;
  html?: string;
}

const QUERY_KEY = "admin-emails";

async function fetchAdminEmails(): Promise<AdminEmail[]> {
  const { data, error } = await supabase
    .from("admin_emails")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data as unknown as AdminEmail[]) ?? [];
}

export function useAdminEmails() {
  const queryClient = useQueryClient();

  const { data: emails = [], isLoading, error } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: fetchAdminEmails,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  }, [queryClient]);

  // ── Send email mutation ──────────────────────────────────────────
  const sendEmail = useMutation({
    mutationFn: async (payload: SendEmailPayload) => {
      const { data, error } = await supabase.functions.invoke("send-admin-email", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // ── Mark as read mutation ────────────────────────────────────────
  const markAsRead = useMutation({
    mutationFn: async (emailId: string) => {
      const { error } = await supabase
        .from("admin_emails")
        .update({ read: true } as never)
        .eq("id", emailId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const inboxEmails = emails.filter((e) => e.direction === "inbound");
  const sentEmails = emails.filter((e) => e.direction === "outbound");
  const unreadCount = inboxEmails.filter((e) => !e.read).length;

  return {
    emails,
    inboxEmails,
    sentEmails,
    unreadCount,
    loading: isLoading,
    error,
    refetch,
    sendEmail,
    markAsRead,
  };
}
