import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { ArrowLeft, Gamepad2, Shield, Clock, Trophy, Loader2, Keyboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getGameConfig } from "@/data/games-config";
import GamePlayer from "@/components/GamePlayer";
import KeymapOverlay from "@/components/KeymapOverlay";
import type { GamePlayerHandle, KeyboardEventData, GamepadEventData } from "@/components/GamePlayer";
import ContestRulesModal, { isRulesDismissed } from "@/components/ContestRulesModal";
import { useScoreExtraction } from "@/hooks/useScoreExtraction";
import { useAntiCheat } from "@/hooks/useAntiCheat";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleNetworkError } from "@/lib/network-error-handler";
import type { Game, Contest } from "@/types/database";
import { getEffectiveStatus } from "@/utils/contestStatus";
import type { DbKeymapping } from "@/data/keymappings";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const ContestPlay = () => {
  const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const { contestSlug, gameId } = useParams<{ contestSlug: string; gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const gamePlayerRef = useRef<GamePlayerHandle>(null);

  const [game, setGame] = useState<(Game & { rom_path?: string; core?: string }) | null>(null);
  const [contest, setContest] = useState<Contest | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Always show rules for paid contests so user explicitly confirms the fee.
  // For free contests, respect the "don't remind me" localStorage preference.
  const isFreeContest = (contest?.session_fee_cents ?? 1) === 0;
  const dismissed = isFreeContest && isRulesDismissed();
  const [showRules, setShowRules] = useState(true); // initialised properly once contest loads
  const [rulesInitialised, setRulesInitialised] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isDeducting, setIsDeducting] = useState(false);
  const feeDeductedRef = useRef(false); // idempotency guard for fee deduction
  const [deductError, setDeductError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [extractingScore, setExtractingScore] = useState(false);
  const [extractedScore, setExtractedScore] = useState<number | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenshotTakenRef = useRef(false);
  const isProcessingScreenshotRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const userRef = useRef(user);
  userRef.current = user;
  const submitVerdictRef = useRef<(score: number) => Promise<void>>(async () => { });

  // Input log for anti-cheat evidence
  const inputLogRef = useRef<Array<{ t: string; k?: string; c?: string; b?: number; ts: number }>>([]);
  const sessionStartMsRef = useRef<number>(0);

  const { mutate: extractScore } = useScoreExtraction();
  const antiCheat = useAntiCheat();

  // Fetch contest + game data
  useEffect(() => {
    if (!contestSlug || !gameId) return;
    const fetchData = async () => {
      const [contestRes, gameRes] = await Promise.all([
        supabase.from("contests").select("*").eq("slug", contestSlug).maybeSingle(),
        supabase.from("games").select("*").eq("slug", gameId).eq("is_active", true).maybeSingle(),
      ]);
      setContest(contestRes.data as any);
      setGame(gameRes.data as any);

      if (contestRes.data) {
        setTimeRemaining(contestRes.data.session_duration_seconds);

        // Determine whether to show rules based on fee + localStorage preference
        if (!rulesInitialised) {
          const free = (contestRes.data.session_fee_cents ?? 0) === 0;
          const skip = free && isRulesDismissed();
          setShowRules(!skip);
          setGameStarted(skip);
          setRulesInitialised(true);
        }
      }

      if (user && contestRes.data) {
        const { data: participant } = await supabase
          .from("contest_participants")
          .select("user_id, is_banned, ban_reason")
          .eq("contest_id", contestRes.data.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setIsParticipant(!!participant);
        if (participant) {
          setIsBanned((participant as any).is_banned ?? false);
          setBanReason((participant as any).ban_reason ?? null);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [contestSlug, gameId, user]);



  useEffect(() => {
    if (!gameStarted || !user || !contest || !game || sessionId) return;
    const createSession = async () => {
      const sid = crypto.randomUUID();
      await supabase.from("game_sessions").insert({
        session_id: sid,
        user_id: user.id,
        contest_id: contest.id,
        game_id: game.id,
        status: "active",
        start_timestamp_ms: Date.now(),
        allowed_duration_seconds: contest.session_duration_seconds,
      });
      setSessionId(sid);
      sessionIdRef.current = sid;
      sessionStartMsRef.current = Date.now();
      inputLogRef.current = [];

      // Start anti-cheat tracking for this session
      antiCheat.setGameConfig(game.slug);
      await antiCheat.startSession(sid);
    };
    createSession();
  }, [gameStarted, user, contest, game, sessionId, antiCheat]);

  // Listen for the game iframe to signal the game has actually started,
  // then kick off RecordRTC. This is in a SEPARATE effect so the listener
  // is NOT cleaned up when sessionId changes (which re-runs the session effect).
  useEffect(() => {
    if (!gameStarted) return;

    const onGameStart = (event: MessageEvent) => {
      if (event.data?.type === 'emulator_game_start') {
        setTimeout(() => {
          gamePlayerRef.current?.startRecording();
        }, 500);
        window.removeEventListener('message', onGameStart);
      }
    };
    window.addEventListener('message', onGameStart);

    return () => {
      window.removeEventListener('message', onGameStart);
    };
  }, [gameStarted]);

  // Handle keyboard events from the game iframe → feed into WASM anti-cheat + log
  const handleKeyboardEvent = useCallback(
    (event: KeyboardEventData) => {
      antiCheat.recordInput();
      if (inputLogRef.current.length < 5000) {
        inputLogRef.current.push({
          t: "key",
          k: event.key,
          c: event.code,
          ts: event.timestamp - sessionStartMsRef.current,
        });
      }
    },
    [antiCheat]
  );

  // Handle gamepad events from the game iframe
  const handleGamepadEvent = useCallback(
    (event: GamepadEventData) => {
      antiCheat.recordInput();
      if (inputLogRef.current.length < 5000) {
        inputLogRef.current.push({
          t: "pad",
          b: event.button,
          ts: event.timestamp - sessionStartMsRef.current,
        });
      }
    },
    [antiCheat]
  );

  const handleAcceptRules = useCallback(async () => {
    if (!user || !contest) return;

    const feeCents = contest.session_fee_cents ?? 0;

    if (feeCents > 0 && !feeDeductedRef.current) {
      setIsDeducting(true);
      setDeductError(null);

      // 1. Verify wallet balance
      const { data: walletData } = await supabase
        .from("wallets")
        .select("balance_cents")
        .eq("user_id", user.id)
        .maybeSingle();
      const balance = walletData?.balance_cents ?? 0;

      if (balance < feeCents) {
        setDeductError(
          `Insufficient balance. You need $${(feeCents / 100).toFixed(2)} but only have $${(balance / 100).toFixed(2)}.`
        );
        setIsDeducting(false);
        return; // keep modal open
      }

      // 2. Generate idempotency key and deduct fee
      const idempotencyKey = crypto.randomUUID();
      const { error } = await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        type: "session_fee" as const,
        amount_cents: feeCents,
        status: "succeeded" as const,
        contest_id: contest.id,
        meta: { idempotency_key: idempotencyKey },
      });

      setIsDeducting(false);

      if (error) {
        setDeductError("Failed to deduct entry fee. Please try again.");
        return; // keep modal open
      }

      // Mark fee as deducted to prevent duplicate charges
      feeDeductedRef.current = true;

      // 3. Invalidate wallet cache so header + dashboard update
      queryClient.invalidateQueries({ queryKey: ["wallet-balance", user.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
      toast.success(`$${(feeCents / 100).toFixed(2)} entry fee deducted. Good luck!`);
    }

    setShowRules(false);
    setGameStarted(true);
  }, [user, contest, queryClient]);

  // Upload screenshot via edge function, then extract score
  const handleScreenshot = useCallback(
    async (file: File) => {
      if (!user || !sessionId || !game || isProcessingScreenshotRef.current) return;
      isProcessingScreenshotRef.current = true;
      setExtractingScore(true);

      // 0. Stop and upload the gameplay recording NOW that screenshot is done
      // This ensures the 2-second pause delay is included in the video
      gamePlayerRef.current?.stopRecording().then(async (recordingFile) => {
        const currentUser = userRef.current;
        const currentSessionId = sessionIdRef.current;
        if (recordingFile && currentUser && currentSessionId) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            const formData = new FormData();
            formData.append("recording", recordingFile);
            formData.append("session_id", currentSessionId);
            const res = await fetch(
              `${BASE_URL}/functions/v1/upload-recording`,
              {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
              }
            );
            const result = await res.json();
            if (!res.ok) {
              console.error("[ContestPlay] Recording upload failed:", result);
            }
          } catch (err) {
            console.error("[ContestPlay] Recording upload error:", err);
          }
        }
      });

      // 1. Upload screenshot via edge function (handles compression & storage)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const formData = new FormData();
        formData.append("screenshot", file);
        formData.append("session_id", sessionId);

        const uploadRes = await fetch(
          `${BASE_URL}/functions/v1/upload-screenshot`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }
        );
        const uploadResult = await uploadRes.json();
        if (!uploadRes.ok) {
          console.error("[ContestPlay] Screenshot upload failed:", uploadResult);
        }
      } catch (err) {
        console.error("[ContestPlay] Screenshot upload error:", err);
      }

      // 2. Extract score via webhook
      extractScore({ file, gameName: game.title }, {
        onSuccess: async (data) => {
          const rawScore = typeof data === "number" ? data : (typeof data?.score === "number" ? data.score : (typeof data?.score === "string" ? Number(data.score) : 0));
          const score = isNaN(rawScore) ? 0 : rawScore;
          setExtractedScore(score);

          const { error } = await supabase
            .from("game_sessions")
            .update({
              score,
              status: "ended" as const,
              end_timestamp_ms: Date.now(),
              ended_at: new Date().toISOString(),
            })
            .eq("session_id", sessionId);

          if (error) {
            console.error("[ContestPlay] Failed to update session score:", error);
            handleNetworkError(error, "Score");
          } else {
            toast.success(`Score recorded: ${score}`);
            queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
          }
          // Submit anti-cheat verdict with real score
          await submitVerdictRef.current(score);
          setExtractingScore(false);
          isProcessingScreenshotRef.current = false;
        },
        onError: async (err) => {
          console.error("[ContestPlay] Score extraction failed:", err);
          toast.error("Could not extract score from screenshot");
          supabase
            .from("game_sessions")
            .update({
              status: "ended" as const,
              end_timestamp_ms: Date.now(),
              ended_at: new Date().toISOString(),
            })
            .eq("session_id", sessionId);
          // Submit anti-cheat verdict with score 0 as fallback
          await submitVerdictRef.current(0);
          setExtractingScore(false);
          isProcessingScreenshotRef.current = false;
        },
      });
    },
    [user, sessionId, game, extractScore, queryClient]
  );

  // Submit anti-cheat verdict to Supabase
  const submitAntiCheatVerdict = useCallback(
    async (reportedScore: number) => {
      if (!user || !contest || !game || !sessionId) return;
      try {
        const verdict = antiCheat.submitScore(sessionId, reportedScore);

        const evidenceWithInputs = {
          ...verdict.evidence,
          inputLog: inputLogRef.current,
        };

        const { error } = await supabase.from("anti_cheat_logs").insert({
          session_id: sessionId,
          user_id: user.id,
          contest_id: contest.id,
          game_id: game.id,
          status: verdict.status,
          reason: verdict.reason,
          evidence: evidenceWithInputs as any,
        });

        if (error) {
          console.error("[ContestPlay] Failed to save anti-cheat log:", error);
        }
      } catch (err) {
        console.error("[ContestPlay] Anti-cheat verdict error:", err);
      }
    },
    [user, contest, game, sessionId, antiCheat]
  );
  submitVerdictRef.current = submitAntiCheatVerdict;

  // ── Manual end-session handler ────────────────────────────────────────────
  // Guards with the same idempotency ref the timer uses (`screenshotTakenRef`),
  // so a manual end cannot race with an imminent natural expiry.
  const handleManualEndSession = useCallback(() => {
    if (!gameStarted || timeUp || screenshotTakenRef.current) return;

    // Prevent the countdown timer from firing a duplicate screenshot
    screenshotTakenRef.current = true;

    // Stop the countdown immediately
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Send pause signal and wait 2 seconds for screenshot
    gamePlayerRef.current?.endSessionAndCapture();

    // Transition UI to the existing end-of-session overlay
    setTimeUp(true);
  }, [gameStarted, timeUp]);

  // Countdown timer — capture screenshot right before time ends
  useEffect(() => {
    if (!gameStarted || timeUp) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Capture screenshot before showing time-up overlay
          if (!screenshotTakenRef.current) {
            screenshotTakenRef.current = true;
            gamePlayerRef.current?.endSessionAndCapture();
          }
          // Anti-cheat verdict is submitted after score extraction (see handleScreenshot callbacks)
          setTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, timeUp, submitAntiCheatVerdict]);

  // --- Guard screens (login, loading, not found, not participant) ---
  if (!user) {
    return (
      <Layout>
        <PageMeta title="Login Required" />
        <section className="bg-grid py-16">
          <div className="container flex flex-col items-center justify-center py-20 text-center">
            <Trophy className="mb-4 h-16 w-16 text-neon-pink/40" />
            <h1 className="mb-2 font-arcade text-lg text-foreground">Login Required</h1>
            <p className="mb-6 text-sm text-muted-foreground">You need to be logged in to play contest games.</p>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/80">
              <Link to="/login">Log In to Continue</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <PageMeta title="Loading..." />
        <section className="bg-grid py-16">
          <div className="container flex items-center justify-center py-20">
            <Gamepad2 className="h-8 w-8 animate-pulse text-primary" />
          </div>
        </section>
      </Layout>
    );
  }

  if (!game || !contest) {
    return (
      <Layout>
        <PageMeta title="Not Found" />
        <section className="bg-grid py-16">
          <div className="container flex flex-col items-center justify-center py-20 text-center">
            <Gamepad2 className="mb-4 h-16 w-16 text-muted-foreground/40" />
            <h1 className="mb-2 font-arcade text-lg text-foreground">Not Found</h1>
            <p className="mb-6 text-sm text-muted-foreground">The contest or game you're looking for doesn't exist.</p>
            <Button asChild>
              <Link to="/games"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Games</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const effectiveStatus = getEffectiveStatus(contest);

  if (effectiveStatus === "upcoming") {
    const formattedDate = contest.starts_at
      ? format(new Date(contest.starts_at), "MMMM d, yyyy 'at' h:mm a")
      : null;
    return (
      <Layout>
        <PageMeta title={`Contest Not Started - ${contest.title}`} />
        <section className="bg-grid py-16">
          <div className="container flex flex-col items-center justify-center py-20 text-center">
            <Clock className="mb-4 h-16 w-16 text-primary/40" />
            <h1 className="mb-2 font-arcade text-lg text-foreground">Contest Not Started</h1>
            <p className="mb-2 text-sm text-muted-foreground">
              The contest "{contest.title}" hasn't started yet.
            </p>
            {formattedDate && (
              <p className="mb-6 text-sm text-muted-foreground">
                Starts on <span className="font-semibold text-foreground">{formattedDate}</span>
              </p>
            )}
            {!formattedDate && <p className="mb-6 text-sm text-muted-foreground">Start date to be announced.</p>}
            <div className="flex gap-3">
              <Button asChild>
                <Link to={`/free-play/${gameId}`}>Play for Free</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contest"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Contests</Link>
              </Button>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (effectiveStatus === "closed") {
    const formattedEndDate = contest.ends_at
      ? format(new Date(contest.ends_at), "MMMM d, yyyy 'at' h:mm a")
      : null;
    return (
      <Layout>
        <PageMeta title={`Contest Closed - ${contest.title}`} />
        <section className="bg-grid py-16">
          <div className="container flex flex-col items-center justify-center py-20 text-center">
            <Trophy className="mb-4 h-16 w-16 text-destructive/40" />
            <h1 className="mb-2 font-arcade text-lg text-foreground">Contest Has Ended</h1>
            <p className="mb-2 text-sm text-muted-foreground">
              The contest "{contest.title}" has ended.
            </p>
            {formattedEndDate && (
              <p className="mb-6 text-sm text-muted-foreground">
                Ended on <span className="font-semibold text-foreground">{formattedEndDate}</span>
              </p>
            )}
            <div className="flex gap-3">
              <Button asChild>
                <Link to={`/free-play/${gameId}`}>Play for Free</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contest"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Contests</Link>
              </Button>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (!isParticipant) {
    return (
      <Layout>
        <PageMeta title={`Not a Participant - ${contest.title}`} />
        <section className="bg-grid py-16">
          <div className="container flex flex-col items-center justify-center py-20 text-center">
            <Shield className="mb-4 h-16 w-16 text-neon-pink/40" />
            <h1 className="mb-2 font-arcade text-lg text-foreground">Not a Participant</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              You need to join the contest "{contest.title}" before you can play.
            </p>
            <Button asChild>
              <Link to="/contest"><ArrowLeft className="mr-2 h-4 w-4" /> View Contests</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  if (isBanned) {
    return (
      <Layout>
        <PageMeta title={`Access Restricted - ${contest.title}`} />
        <section className="bg-grid py-16">
          <div className="container flex flex-col items-center justify-center py-20 text-center">
            <Shield className="mb-4 h-16 w-16 text-destructive/60" />
            <h1 className="mb-2 font-arcade text-lg text-destructive">Access Restricted</h1>
            <p className="mb-2 text-sm text-muted-foreground">
              You have been banned from the contest "{contest.title}".
            </p>
            {banReason && (
              <p className="mb-6 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-muted-foreground">
                Reason: <span className="font-semibold text-foreground">{banReason}</span>
              </p>
            )}
            {!banReason && <p className="mb-6 text-xs text-muted-foreground">No reason was provided.</p>}
            <Button variant="outline" asChild>
              <Link to="/contest"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Contests</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const config = getGameConfig(game.slug);
  const timerColor =
    timeRemaining <= 30 ? "text-destructive" :
      timeRemaining <= 60 ? "text-yellow-500" :
        "text-neon-green";
  const timerPulse = timeRemaining <= 30 && !timeUp ? "animate-pulse" : "";

  const generateContestPlaySchema = () => {
    return {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": `${game.title} - ${contest.title}`,
      "description": `Play ${game.title} in the ${contest.title} contest on Arcade Champs.`,
      "startDate": contest.starts_at || new Date().toISOString(),
      "endDate": contest.ends_at,
      "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
      "eventStatus": contest.status === "active" ? "https://schema.org/EventRescheduled" : "https://schema.org/EventScheduled",
      "location": {
        "@type": "VirtualLocation",
        "url": `https://play.arcadechamps.com/contest-play/${contest.slug}/${game.slug}`
      },
      "offers": {
        "@type": "Offer",
        "price": (contest.session_fee_cents / 100).toFixed(2),
        "priceCurrency": "USD",
        "availability": contest.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "url": `https://play.arcadechamps.com/contest-play/${contest.slug}/${game.slug}`
      }
    };
  };

  return (
    <Layout>
      <PageMeta
        title={`${game.title} | ${contest.title} - Contest Mode`}
        description={`Play ${game.title} in the ${contest.title} contest on Arcade Champs.`}
        schema={generateContestPlaySchema()}
        ogImage={game.thumbnail_path ? `${BASE_URL}/storage/v1/object/public/game-thumbnails/${game.thumbnail_path}` : undefined}
        canonicalUrl={`/contest-play/${contest.slug}/${game.slug}`}
      />
      <ContestRulesModal
        open={showRules && !gameStarted}
        onAccept={handleAcceptRules}
        onCancel={() => navigate("/contest")}
        contestTitle={contest.title}
        durationSeconds={contest.session_duration_seconds}
        feeCents={contest.session_fee_cents}
        isDeducting={isDeducting}
        deductError={deductError}
      />

      {/* ── End-session confirmation dialog ─────────────────────────────── */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-arcade text-sm">End Your Game?</AlertDialogTitle>
            <AlertDialogDescription>
              Your session will end immediately and your current score will be captured.
              This cannot be undone — the game will not continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Playing</AlertDialogCancel>
            <AlertDialogAction
              id="confirm-end-session-btn"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowEndConfirm(false);
                handleManualEndSession();
              }}
            >
              End my Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="bg-grid py-6">
        <div className="container">
          <div className="mb-4 flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/games"><ArrowLeft className="mr-1 h-4 w-4" /> Games</Link>
            </Button>
            <div className="flex items-center gap-2">
              <span className="rounded-sm bg-neon-pink/20 px-2 py-0.5 text-[10px] font-bold text-neon-pink">CONTEST</span>
              <h1 className="font-arcade text-xs text-foreground md:text-sm">{game.title}</h1>
            </div>
          </div>

          {/* Contest info bar */}
          <div className="mx-auto mb-4 flex max-w-4xl flex-wrap items-center gap-4 rounded-lg border border-neon-pink/20 bg-neon-pink/5 px-4 py-2.5 text-xs text-muted-foreground">
            <span className={`flex items-center gap-1 font-arcade text-sm ${timerColor} ${timerPulse}`}>
              <Clock className="h-4 w-4" /> {formatTime(timeRemaining)}
            </span>
            <span className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-neon-green" /> Anti-Cheat Active
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-primary" /> Score Tracked
            </span>
            <span className="ml-auto font-arcade text-[10px] text-neon-pink">{contest.title}</span>
          </div>

          {/* Game container + keymap */}
          <div className="mx-auto flex max-w-5xl items-start gap-3">
            <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-neon-pink/30 bg-card">
              {gameStarted ? (
                <GamePlayer
                  ref={gamePlayerRef}
                  romPath={game.rom_path ?? config?.rom ?? game.slug}
                  core={game.core ?? config?.core ?? "mame2003_plus"}
                  title={game.title}
                  onScreenshot={handleScreenshot}
                  onKeyboardEvent={handleKeyboardEvent}
                  onGamepadEvent={handleGamepadEvent}
                  onEndSession={!timeUp ? () => setShowEndConfirm(true) : undefined}
                />
              ) : (
                <div className="flex h-[500px] items-center justify-center">
                  <p className="font-arcade text-xs text-muted-foreground">Accept the rules to start playing...</p>
                </div>
              )}

              {/* Time's up overlay */}
              {timeUp && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
                  {extractingScore ? (
                    <>
                      <Loader2 className="mb-4 h-16 w-16 animate-spin text-primary" />
                      <h2 className="mb-2 font-arcade text-lg text-primary">Extracting Score...</h2>
                      <p className="text-sm text-muted-foreground">Analyzing your gameplay screenshot</p>
                    </>
                  ) : extractedScore !== null ? (
                    <>
                      <Trophy className="mb-4 h-16 w-16 text-neon-green" />
                      <h2 className="mb-2 font-arcade text-xl text-neon-green">Score: {extractedScore}</h2>
                      <p className="mb-6 text-sm text-muted-foreground">Your score has been recorded!</p>
                      <Button asChild>
                        <Link to="/contest">Back to Contests</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Clock className="mb-4 h-16 w-16 text-destructive" />
                      <h2 className="mb-2 font-arcade text-xl text-destructive">Time's Up!</h2>
                      <p className="mb-6 text-sm text-muted-foreground">Your contest session has ended.</p>
                      <Button asChild>
                        <Link to="/contest">Back to Contests</Link>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="hidden shrink-0 lg:block">
              <KeymapOverlay
                gameSlug={game.slug}
                core={game.core ?? config?.core ?? "mame2003_plus"}
                dbKeymapping={(game as any).keymapping as DbKeymapping | null}
              />
            </div>
          </div>

          {/* Input method recommendation */}
          {config?.inputMethod && (
            <div className="mx-auto mt-3 max-w-4xl">
              <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 text-xs text-muted-foreground">
                {config.inputMethod === 'controller' ? (
                  <><Gamepad2 className="h-3 w-3 text-primary" /> Best played with a USB/Bluetooth controller</>
                ) : (
                  <><Keyboard className="h-3 w-3 text-primary" /> Keyboard recommended</>
                )}
              </Badge>
            </div>
          )}

          {/* Game info */}
          <div className="mx-auto mt-6 max-w-4xl rounded-lg border border-border/50 bg-card p-4">
            <h2 className="font-arcade text-[10px] text-foreground">{game.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {config?.description ?? (game as any).description ?? "Contest Mode — timed session with anti-cheat and score submission."}
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ContestPlay;
