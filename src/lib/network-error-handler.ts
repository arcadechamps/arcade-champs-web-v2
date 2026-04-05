import { toast } from "sonner";

let lastOfflineToast = 0;
const OFFLINE_THROTTLE_MS = 5000;

/** Shape of Supabase PostgREST / GoTrue errors */
interface SupabaseErrorShape {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

/** Options for retry behaviour */
interface ErrorHandlerOptions {
  /** Callback invoked when user clicks "Retry" on the toast */
  onRetry?: () => void;
}

/** Build the action prop for sonner toasts when a retry callback is provided */
function retryAction(onRetry?: () => void) {
  if (!onRetry) return {};
  return {
    action: {
      label: "Retry",
      onClick: onRetry,
    },
  };
}

/**
 * Handles a Supabase `{ data, error }` response inline.
 * Returns true if there was an error (and a toast was shown), false otherwise.
 * Usage: `if (handleSupabaseError(error, "Contest", { onRetry: () => refetch() })) return;`
 */
export function handleSupabaseError(
  error: SupabaseErrorShape | null | undefined,
  context?: string,
  options?: ErrorHandlerOptions
): boolean {
  if (!error) return false;
  handleNetworkError(error, context, options);
  return true;
}

/**
 * Classifies a network/Supabase error and shows an appropriate user-facing toast.
 * Returns a normalized error message string.
 */
export function handleNetworkError(
  error: unknown,
  context?: string,
  options?: ErrorHandlerOptions
): string {
  const prefix = context ? `${context}: ` : "";
  const retry = retryAction(options?.onRetry);

  // Offline detection
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const now = Date.now();
    if (now - lastOfflineToast > OFFLINE_THROTTLE_MS) {
      lastOfflineToast = now;
      toast.error("You're offline", {
        description: "Please check your internet connection and try again.",
        id: "network-offline",
        ...retry,
      });
    }
    return "Network offline";
  }

  // Fetch TypeError (CORS, DNS, network failure)
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    toast.error(`${prefix}Connection failed`, {
      description: "Could not reach the server. Please check your connection.",
      id: "fetch-failed",
      ...retry,
    });
    return "Connection failed";
  }

  // Supabase PostgREST / GoTrue error shape
  if (error && typeof error === "object" && "message" in error) {
    const err = error as { message: string; code?: string; status?: number; details?: string };

    // Auth session expired / invalid — no retry (user must re-login)
    if (err.status === 401 || err.code === "PGRST301" || err.message?.includes("JWT expired")) {
      toast.error("Session expired", {
        description: "Please sign in again to continue.",
        id: "session-expired",
      });
      return "Session expired";
    }

    // Permission denied — no retry
    if (err.status === 403 || err.code === "42501" || err.message?.includes("permission denied")) {
      toast.error("Access denied", {
        description: "You don't have permission to perform this action.",
        id: "access-denied",
      });
      return "Access denied";
    }

    // Rate limited — retry makes sense
    if (err.status === 429) {
      toast.error("Too many requests", {
        description: "Please wait a moment and try again.",
        id: "rate-limited",
        ...retry,
      });
      return "Rate limited";
    }

    // Server error — retry makes sense
    if (err.status && err.status >= 500) {
      toast.error(`${prefix}Server error`, {
        description: "Something went wrong on our end. Please try again later.",
        id: "server-error",
        ...retry,
      });
      return "Server error";
    }

    // Generic Supabase/Postgrest error with a message
    const msg = err.details || err.message;
    toast.error(`${prefix}Request failed`, {
      description: msg.length > 120 ? msg.slice(0, 120) + "…" : msg,
      ...retry,
    });
    return msg;
  }

  // Fallback
  const fallback = error instanceof Error ? error.message : "An unexpected error occurred";
  toast.error(`${prefix}Error`, {
    description: fallback.length > 120 ? fallback.slice(0, 120) + "…" : fallback,
    ...retry,
  });
  return fallback;
}

/**
 * Sets up global listeners for online/offline events.
 */
export function setupNetworkListeners() {
  window.addEventListener("offline", () => {
    toast.error("You're offline", {
      description: "Some features may not work until you reconnect.",
      id: "network-offline",
      duration: Infinity,
    });
  });

  window.addEventListener("online", () => {
    toast.success("Back online", {
      description: "Your connection has been restored.",
      id: "network-online",
      duration: 3000,
    });
    // Dismiss the persistent offline toast
    toast.dismiss("network-offline");
  });
}
