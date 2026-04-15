import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { Maximize2, Minimize2, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import RecordRTC from "recordrtc";

const STORAGE_BASE =
  `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/game-roms`;

export interface KeyboardEventData {
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  timestamp: number;
}

export interface GamepadEventData {
  gamepadIndex: number;
  button: number;
  timestamp: number;
}

interface GamePlayerProps {
  romPath: string;
  core: string;
  title: string;
  bios?: string;
  onScreenshot?: (file: File) => void;
  onKeyboardEvent?: (event: KeyboardEventData) => void;
  onGamepadEvent?: (event: GamepadEventData) => void;
  /** When provided, renders an "End my Game" button in the topbar that fires this callback. */
  onEndSession?: () => void;
}

export interface GamePlayerHandle {
  captureScreenshot: () => void;
  startRecording: () => void;
  stopRecording: () => Promise<File | null>;
}

const GamePlayer = forwardRef<GamePlayerHandle, GamePlayerProps>(
  ({ romPath, core, title, bios, onScreenshot, onKeyboardEvent, onGamepadEvent, onEndSession }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const onScreenshotRef = useRef(onScreenshot);
    onScreenshotRef.current = onScreenshot;
    const onKeyboardEventRef = useRef(onKeyboardEvent);
    onKeyboardEventRef.current = onKeyboardEvent;
    const onGamepadEventRef = useRef(onGamepadEvent);
    onGamepadEventRef.current = onGamepadEvent;

    // RecordRTC refs
    const recorderRef = useRef<RecordRTC | null>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Detect if the ROM is a local file (in public/ folder) or remote (Supabase Storage).
    // Local paths start with 'emulator/' and are served directly from the public folder.
    const isLocalRom = romPath.startsWith("emulator/");
    const romUrl = isLocalRom ? `/${romPath}` : `${STORAGE_BASE}/${romPath}`;
    const romFileName = romPath.split("/").pop() || romPath;

    const iframeSrc =
      core === "custom"
        ? `/${romPath}`
        : `/game-frame.html?rom=${encodeURIComponent(romUrl)}&core=${encodeURIComponent(core)}&title=${encodeURIComponent(title)}&fileName=${encodeURIComponent(romFileName)}${bios ? `&bios=${encodeURIComponent(isLocalRom && !bios.startsWith('http') ? `/${bios}` : bios)}` : ''}`;

    // Recording promise resolver
    const recordingResolverRef = useRef<((file: File | null) => void) | null>(null);

    // Helper: find the game canvas inside the iframe
    const findGameCanvas = useCallback((): HTMLCanvasElement | null => {
      const iframe = iframeRef.current;
      if (!iframe) return null;

      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return null;

        // Custom/core games (Space Cadet) have a known canvas id="canvas"
        if (core === "custom") {
          const c = iframeDoc.getElementById("canvas") as HTMLCanvasElement | null;
          if (c && c.width >= 10 && c.height >= 10) return c;
        }

        // EmulatorJS: find the largest canvas
        let best: HTMLCanvasElement | null = null;
        let bestPx = 0;
        iframeDoc.querySelectorAll("canvas").forEach((el) => {
          const c = el as HTMLCanvasElement;
          const px = c.width * c.height;
          if (px > bestPx) { bestPx = px; best = c; }
        });
        return best && best.width >= 10 && best.height >= 10 ? best : null;
      } catch {
        return null; // cross-origin
      }
    }, [core]);

    // Helper: draw the game canvas onto the offscreen canvas each frame
    // IMPORTANT: Never changes offscreen canvas dimensions (they are locked at start).
    // Frames are scaled to fit.
    const drawIframeToCanvas = useCallback(() => {
      const canvas = offscreenCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const gameCanvas = findGameCanvas();
      if (gameCanvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(gameCanvas, 0, 0, canvas.width, canvas.height);
      } else {
        // Canvas not available yet — draw placeholder
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }, [findGameCanvas]);

    // Expose captureScreenshot, startRecording, stopRecording to parent
    useImperativeHandle(ref, () => ({
      captureScreenshot: () => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "CAPTURE_SCREENSHOT" },
          "*"
        );
      },
      startRecording: () => {
        // Poll for the game canvas before creating the stream.
        // This ensures the offscreen canvas has correct dimensions BEFORE
        // captureStream() is called (changing dimensions after breaks the stream).
        let attempts = 0;
        const maxAttempts = 30; // 30 × 100ms = 3 seconds

        const tryStart = () => {
          attempts++;
          const gameCanvas = findGameCanvas();

          if (!gameCanvas) {
            if (attempts < maxAttempts) {
              setTimeout(tryStart, 100);
              return;
            }
            console.warn("[GamePlayer] No valid game canvas found after retries, using default size");
          }

          try {
            // Create offscreen canvas with LOCKED dimensions
            const offscreen = document.createElement("canvas");
            offscreen.width = gameCanvas?.width || 640;
            offscreen.height = gameCanvas?.height || 480;
            offscreenCanvasRef.current = offscreen;

            // Draw the FIRST frame before starting the stream
            const ctx = offscreen.getContext("2d");
            if (ctx && gameCanvas) {
              ctx.drawImage(gameCanvas, 0, 0, offscreen.width, offscreen.height);
            }

            // NOW create the stream (canvas has correct content & dimensions)
            const stream = offscreen.captureStream(10);

            // Create RecordRTC instance
            const recorder = new RecordRTC(stream, {
              type: "video",
              mimeType: "video/webm;codecs=vp8",
              videoBitsPerSecond: 200000,
              disableLogs: true,
            });

            recorder.startRecording();
            recorderRef.current = recorder;

            // Start continuous frame capture (dimensions stay locked)
            captureIntervalRef.current = setInterval(drawIframeToCanvas, 100);
          } catch (err) {
            console.error("[GamePlayer] Failed to start RecordRTC recording:", err);
          }
        };

        tryStart();
      },
      stopRecording: () => {
        return new Promise<File | null>((resolve) => {
          const recorder = recorderRef.current;

          // Clean up the frame capture interval
          if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
          }

          if (!recorder) {
            console.warn("[GamePlayer] No active recorder to stop");
            resolve(null);
            return;
          }

          recorder.stopRecording(() => {
            try {
              const blob = recorder.getBlob();
              if (blob && blob.size > 0) {
                const file = new File([blob], `recording_${Date.now()}.webm`, {
                  type: "video/webm",
                });
                resolve(file);
              } else {
                console.warn("[GamePlayer] RecordRTC produced empty blob");
                resolve(null);
              }
            } catch (err) {
              console.error("[GamePlayer] Error getting recording blob:", err);
              resolve(null);
            } finally {
              recorderRef.current = null;
              offscreenCanvasRef.current = null;
            }
          });

          // Timeout after 10s in case stopRecording callback never fires
          setTimeout(() => {
            if (recorderRef.current) {
              console.warn("[GamePlayer] Recording stop timed out");
              recorderRef.current = null;
              offscreenCanvasRef.current = null;
              resolve(null);
            }
          }, 10000);
        });
      },
    }));

    // Listen for screenshot data and keyboard events from iframe
    // (Recording is no longer proxied through the iframe)
    useEffect(() => {
      const handler = (event: MessageEvent) => {
        if (
          event.data?.type === "emulator_screenshot" &&
          event.data?.data &&
          onScreenshotRef.current
        ) {
          try {
            const base64Data: string = event.data.data;
            const byteString = atob(base64Data.split(",")[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: "image/png" });
            const file = new File([blob], `screenshot_${Date.now()}.png`, {
              type: "image/png",
            });
            onScreenshotRef.current(file);
          } catch (err) {
            console.error("[GamePlayer] Error processing screenshot:", err);
          }
        }

        // Forward keyboard events from the game iframe to the anti-cheat system
        if (event.data?.type === "keyboard-event" && onKeyboardEventRef.current) {
          onKeyboardEventRef.current(event.data as KeyboardEventData);
        }

        // Forward gamepad events from the game iframe
        if (event.data?.type === "gamepad-event" && onGamepadEventRef.current) {
          onGamepadEventRef.current(event.data as GamepadEventData);
        }
      };
      window.addEventListener("message", handler);
      return () => window.removeEventListener("message", handler);
    }, []);

    // Cleanup recording on unmount
    useEffect(() => {
      return () => {
        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current);
        }
        if (recorderRef.current) {
          try {
            recorderRef.current.stopRecording(() => { });
          } catch { /* ignore */ }
          recorderRef.current = null;
        }
      };
    }, []);

    // Prevent page scroll during gameplay — lock overflow + intercept game keys
    useEffect(() => {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      const GAME_KEYS = new Set([
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        ' ', 'Space',
        'w', 'a', 's', 'd',
        'z', 'x', 'c',
      ]);

      const preventScroll = (e: KeyboardEvent) => {
        if (GAME_KEYS.has(e.key) || GAME_KEYS.has(e.code)) {
          e.preventDefault();
        }
      };

      window.addEventListener('keydown', preventScroll, { passive: false });
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        window.removeEventListener('keydown', preventScroll);
      };
    }, []);

    // Auto-focus iframe after mount so gamepad input is received
    // (fixes controllers not working after ContestRulesModal closes)
    useEffect(() => {
      const timer = setTimeout(() => {
        iframeRef.current?.focus();
      }, 600);
      return () => clearTimeout(timer);
    }, []);

    // Sync fullscreen state when user presses Escape or exits via browser UI
    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);

        // Refocus the iframe so the "Fullscreen" button doesn't trap keyboard focus.
        // Otherwise, games using Spacebar (like Pinball) will unexpectedly trigger the button
        // or appear "frozen" because inputs aren't reaching the iframe.
        setTimeout(() => {
          iframeRef.current?.focus();
        }, 100);
      };
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      return () =>
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
      if (!containerRef.current) return;
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => { });
      } else {
        document.exitFullscreen().catch(() => { });
      }
    }, []);

    return (
      <div
        ref={containerRef}
        className={`relative w-full ${isFullscreen ? "bg-black flex flex-col h-full" : ""}`}
        onClick={() => {
          // Ensure keyboard focus returns to the game iframe if the user clicks the header
          // or empty space around the game.
          if (document.activeElement !== iframeRef.current) {
            iframeRef.current?.focus();
          }
        }}
      >
        <div className="flex items-center justify-between border-b border-border/50 bg-secondary/30 px-4 py-2">
          <span className="text-xs text-muted-foreground">{core}</span>
          <div className="flex items-center gap-1">
            {onEndSession && (
              <Button
                id="end-my-game-btn"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onEndSession}
                title="End my game session early"
              >
                <StopCircle className="h-3.5 w-3.5" />
                End my Game
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
        <div
          ref={gameAreaRef}
          className={`w-full bg-background/50 ${isFullscreen ? "flex-1" : "aspect-video"}`}
        >
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title={title}
            className="h-full w-full border-0"
            allow="autoplay; fullscreen; gamepad"
          />
        </div>
      </div>
    );
  }
);

GamePlayer.displayName = "GamePlayer";

export default GamePlayer;
