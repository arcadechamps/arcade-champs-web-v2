import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const reverifyQueryKey = (userId: string | undefined) => ["reverify-status", userId] as const;

const fetchReverifyRequired = async (): Promise<boolean> => {
  const { data, error } = await supabase.rpc("my_reverify_status");
  if (error) throw error;
  return data === true;
};

/**
 * Whether the signed-in player must confirm an emailed code before continuing.
 * Cached for the session; call `markVerified` / `recheck` after the OTP flow.
 */
export const useReverifyStatus = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: reverifyQueryKey(userId),
    queryFn: fetchReverifyRequired,
    enabled: Boolean(userId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const recheck = async (): Promise<boolean> => {
    const required = await fetchReverifyRequired();
    queryClient.setQueryData(reverifyQueryKey(userId), required);
    return required;
  };

  return {
    isLoading: query.isLoading,
    // Fail open on RPC errors: the backend still enforces the flag, and we avoid a hard lockout.
    reverifyRequired: query.data === true,
    recheck,
  };
};
