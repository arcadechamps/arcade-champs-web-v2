import { useCallback, useEffect, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────

/** Raw verdict returned by the WASM engine */
export interface WasmVerdict {
  accepted: boolean;
  suspicious: boolean;
  reasonCodes: string[];
  [key: string]: unknown;
}

/** Mapped verdict for the DB (anti_cheat_logs) */
export interface AntiCheatVerdict {
  status: "clean" | "suspected" | "confirmed";
  reason: string | null;
  evidence: Record<string, unknown>;
}

type CCallFn = (
  ident: string,
  returnType: string | null,
  argTypes: string[],
  args: unknown[]
) => unknown;

// ── Default thresholds ───────────────────────────────────────────────
const DEFAULT_CONFIG = {
  timeLimitMs: 600_000,
  maxFocusLosses: 5,
  maxBlurMs: 30_000,
  minInputsForScore: 10,
  maxAPS: 30,
  burstInputsThreshold: 50,
  afkStartMs: 15_000,
};

// ── Per-game overrides ───────────────────────────────────────────────
const GAME_CONFIGS: Record<string, Partial<typeof DEFAULT_CONFIG>> = {
  "space-cadet": { maxAPS: 20 },
  "tetris": { minInputsForScore: 30 },
  "inthunt": { maxAPS: 25, minInputsForScore: 20 },
  "opwolf": { maxAPS: 25, minInputsForScore: 15 },
  "outrun": { maxAPS: 15, minInputsForScore: 20, maxFocusLosses: 3 },
  "rtype": { maxAPS: 25, minInputsForScore: 20 },
  "mspacman": { maxFocusLosses: 3, maxBlurMs: 10_000 },
  "metal-slug": { maxAPS: 28, minInputsForScore: 25 },
  "contra": { maxAPS: 28, minInputsForScore: 25 },
  "dkong": { maxAPS: 15, minInputsForScore: 15 },
  "sonic": { maxAPS: 20, minInputsForScore: 20 },
};

// ── Input batching interval ──────────────────────────────────────────
const INPUT_FLUSH_INTERVAL_MS = 500;

// ── MODULE-LEVEL state (shared across all hook instances) ────────────
let wasmReady = false;
let wasmLoading = false;
let wasmInitPromise: Promise<void> | null = null;

/** Get the global ccall function exposed by Emscripten */
function getGlobalCCall(): CCallFn | null {
  const w = window as any;
  return w.ccall ?? w.Module?.ccall ?? null;
}

/** Check if WASM is already loaded from a previous mount */
function detectAlreadyLoaded(): boolean {
  const cc = getGlobalCCall();
  if (cc) {
    wasmReady = true;
    wasmLoading = false;
    return true;
  }
  return false;
}

/** Load the WASM script and return a promise that resolves when ready */
function ensureWasmLoaded(): Promise<void> {
  // Already ready
  if (wasmReady || detectAlreadyLoaded()) return Promise.resolve();

  // Already loading — return existing promise
  if (wasmInitPromise) return wasmInitPromise;

  wasmLoading = true;

  wasmInitPromise = new Promise<void>((resolve) => {
    // Set up Module config before loading the script
    (window as any).Module = {
      onRuntimeInitialized() {
        const cc = getGlobalCCall();
        if (!cc) {
          console.error("[AntiCheat] ccall not found after WASM init");
          wasmLoading = false;
          resolve(); // resolve anyway so polling can detect the failure
          return;
        }

        // One-time engine init with global defaults
        try {
          cc("ac_init", "number", ["string"], [JSON.stringify(DEFAULT_CONFIG)]);
        } catch (err) {
          console.error("[AntiCheat] ac_init() failed:", err);
        }

        wasmReady = true;
        wasmLoading = false;
        resolve();
      },
    };

    const script = document.createElement("script");
    script.src = "/arcade_core.js";
    script.async = true;
    script.onerror = () => {
      console.error("[AntiCheat] Failed to load arcade_core.js");
      wasmLoading = false;
      resolve(); // resolve so callers aren't stuck forever
    };
    document.body.appendChild(script);
  });

  return wasmInitPromise;
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useAntiCheat() {
  const sessionActiveRef = useRef(false);
  const sessionStartMsRef = useRef<number>(0);
  const currentSessionIdRef = useRef<string | null>(null);
  const inputCountRef = useRef(0);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────
  const ccallJson = useCallback(
    (fn: string, json: Record<string, unknown>, returnType: string | null = "number"): string | null => {
      const cc = getGlobalCCall();
      if (!wasmReady || !cc) return null;
      try {
        const result = cc(fn, returnType, ["string"], [JSON.stringify(json)]);
        return result as string | null;
      } catch (err) {
        console.error(`[AntiCheat] ${fn}() failed:`, err);
        return null;
      }
    },
    []
  );

  // ── Load WASM on mount ──────────────────────────────────────────────
  useEffect(() => {
    ensureWasmLoaded();
  }, []);

  // ── Focus / blur tracking ────────────────────────────────────────────
  useEffect(() => {
    const sendFocusEvent = (type: "focus_lost" | "focus_gained") => {
      if (!sessionActiveRef.current) return;
      ccallJson("ac_notify_event", { type });
    };

    const handleVisibility = () => {
      sendFocusEvent(document.hidden ? "focus_lost" : "focus_gained");
    };
    const handleBlur = () => sendFocusEvent("focus_lost");
    const handleFocus = () => sendFocusEvent("focus_gained");

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [ccallJson]);

  // ── Lifecycle methods ──────────────────────────────────────────────

  const setGameConfig = useCallback((gameSlug: string) => {
    const overrides = GAME_CONFIGS[gameSlug];
    if (!overrides) return;
    const cc = getGlobalCCall();
    if (!wasmReady || !cc) return;
    try {
      cc("ac_set_game_config", "number", ["string"], [JSON.stringify(overrides)]);
    } catch (err) {
      console.error("[AntiCheat] ac_set_game_config() failed:", err);
    }
  }, []);

  /**
   * Start a session — waits up to 10s for WASM to be ready.
   * Returns a Promise so callers can await it.
   */
  const startSession = useCallback(
    async (sessionId: string): Promise<void> => {
      // Wait for WASM to load (up to ~10s)
      await ensureWasmLoaded();

      // If the promise resolved but WASM still isn't ready, poll briefly
      if (!wasmReady) {
        let attempts = 0;
        while (!wasmReady && attempts < 50) {
          await new Promise((r) => setTimeout(r, 200));
          detectAlreadyLoaded();
          attempts++;
        }
      }

      const cc = getGlobalCCall();
      if (!wasmReady || !cc) {
        console.warn("[AntiCheat] WASM not ready after 10s — session will be unverified");
        return;
      }

      try {
        cc("ac_start_session", "number", ["string"], [JSON.stringify({ sessionId })]);
      } catch (err) {
        console.error("[AntiCheat] ac_start_session() failed:", err);
        return;
      }

      sessionActiveRef.current = true;
      sessionStartMsRef.current = Date.now();
      currentSessionIdRef.current = sessionId;
      inputCountRef.current = 0;

      // Start input batching flush
      flushIntervalRef.current = setInterval(() => {
        if (!sessionActiveRef.current) return;
        const count = inputCountRef.current;
        if (count > 0) {
          ccallJson("ac_notify_event", { type: "input_sample", inputCount: count });
          inputCountRef.current = 0;
        }
      }, INPUT_FLUSH_INTERVAL_MS);
    },
    [ccallJson]
  );

  const recordInput = useCallback(() => {
    if (!sessionActiveRef.current) return;
    inputCountRef.current += 1;
  }, []);

  const submitScore = useCallback(
    (sessionId: string, reportedScore: number): AntiCheatVerdict => {
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }

      if (inputCountRef.current > 0 && sessionActiveRef.current) {
        ccallJson("ac_notify_event", {
          type: "input_sample",
          inputCount: inputCountRef.current,
        });
        inputCountRef.current = 0;
      }

      const cc = getGlobalCCall();
      if (!wasmReady || !cc) {
        console.warn("[AntiCheat] WASM not ready — marking as suspected");
        sessionActiveRef.current = false;
        return {
          status: "suspected",
          reason: "WASM_NOT_READY",
          evidence: { error: "Anti-cheat engine was not loaded; session could not be verified" },
        };
      }

      const elapsedMs = Date.now() - sessionStartMsRef.current;

      try {
        const raw = cc(
          "ac_submit_score",
          "string",
          ["string"],
          [JSON.stringify({ sessionId, reportedScore, elapsedMs })]
        ) as string;

        sessionActiveRef.current = false;
        currentSessionIdRef.current = null;

        if (!raw || typeof raw !== "string") {
          return {
            status: "suspected",
            reason: "EMPTY_WASM_RESPONSE",
            evidence: { error: "WASM returned empty or non-string response", rawValue: String(raw) },
          };
        }

        const parsed = JSON.parse(raw) as WasmVerdict;
        return mapVerdictToDb(parsed);
      } catch (err) {
        console.error("[AntiCheat] ac_submit_score() failed:", err);
        sessionActiveRef.current = false;
        currentSessionIdRef.current = null;
        return {
          status: "suspected",
          reason: "WASM_ERROR",
          evidence: { error: String(err) },
        };
      }
    },
    [ccallJson]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);
    };
  }, []);

  return {
    get isReady() {
      return wasmReady;
    },
    setGameConfig,
    startSession,
    recordInput,
    submitScore,
  };
}

// ── Verdict → DB mapping ─────────────────────────────────────────────
function mapVerdictToDb(v: WasmVerdict): AntiCheatVerdict {
  let status: "clean" | "suspected" | "confirmed";
  if (v.accepted) {
    status = "clean";
  } else if (v.suspicious) {
    status = "suspected";
  } else {
    status = "confirmed";
  }

  return {
    status,
    reason: v.reasonCodes?.length ? v.reasonCodes.join(", ") : null,
    evidence: JSON.parse(JSON.stringify(v)),
  };
}
