import { useQuery } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const TWO_MINUTES_MS = 2 * 60 * 1000;
const FORBIDDEN_STATUS = 403;

export type CaptchaStatsRange = 7;

export interface CaptchaStatsTotals {
  issued: number;
  solved: number;
  unsolved: number;
  solved_automatically: number;
  solved_with_click: number;
  solve_rate: number;
}

export interface CaptchaDailyStat {
  date: string;
  issued: number;
  solved: number;
  unsolved: number;
}

export interface CaptchaStats {
  totals: CaptchaStatsTotals;
  daily: CaptchaDailyStat[];
}

export class CaptchaStatsForbiddenError extends Error {
  constructor() {
    super("Admin access required to view CAPTCHA stats");
    this.name = "CaptchaStatsForbiddenError";
  }
}

const isForbiddenResponse = (error: unknown): boolean =>
  error instanceof FunctionsHttpError &&
  (error.context as Response | undefined)?.status === FORBIDDEN_STATUS;

const fetchCaptchaStats = async (days: CaptchaStatsRange): Promise<CaptchaStats> => {
  const { data, error } = await supabase.functions.invoke("admin-captcha-stats", {
    body: { days },
  });
  if (isForbiddenResponse(error)) throw new CaptchaStatsForbiddenError();
  if (error) throw error;
  return data as CaptchaStats;
};

export const useCaptchaStats = (days: CaptchaStatsRange) =>
  useQuery({
    queryKey: ["admin-security", "captcha-stats", days],
    queryFn: () => fetchCaptchaStats(days),
    staleTime: TWO_MINUTES_MS,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) =>
      !(error instanceof CaptchaStatsForbiddenError) && failureCount < 1,
  });
