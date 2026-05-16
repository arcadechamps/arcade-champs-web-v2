import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Shield, Trophy, AlertTriangle, Play, ArrowLeft, Loader2, Gamepad2 } from "lucide-react";

const STORAGE_KEY = "contest-rules-dismissed";

export const isRulesDismissed = () => localStorage.getItem(STORAGE_KEY) === "true";

interface ContestRulesModalProps {
  open: boolean;
  onAccept: () => Promise<void>;
  onCancel: () => void;
  contestTitle: string;
  durationSeconds: number;
  feeCents: number;
  isDeducting?: boolean;
  deductError?: string | null;
}

const ContestRulesModal = ({
  open,
  onAccept,
  onCancel,
  contestTitle,
  durationSeconds,
  feeCents,
  isDeducting = false,
  deductError = null,
}: ContestRulesModalProps) => {
  const [dontRemind, setDontRemind] = useState(false);
  const isPaidContest = feeCents > 0;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const timeLabel = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes} minutes`;

  const handleAccept = async () => {
    // Only persist the "don't remind me" preference for free contests.
    // Paid contests always require explicit confirmation before charging.
    if (dontRemind && !isPaidContest) localStorage.setItem(STORAGE_KEY, "true");
    await onAccept();
  };

  return (
    <Dialog open={open} onOpenChange={() => { }}>
      <DialogContent className="border-neon-pink/30 bg-card max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-arcade text-sm text-neon-pink text-center">Contest Rules</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-xs">
            {contestTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-medium text-foreground">Timed Session: {timeLabel}</p>
              <p className="text-[11px] text-muted-foreground">Click 'Start Playing' to begin playing game. No pausing.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3">
            <Gamepad2 className="mt-0.5 h-4 w-4 shrink-0 text-neon-blue" />
            <div>
              <p className="text-xs font-medium text-foreground">Gamepad Recommended ⚠️</p>
              <p className="text-[11px] text-muted-foreground">For the best experience, we highly recommend using a gamepad.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3">
            <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-neon-green" />
            <div>
              <p className="text-xs font-medium text-foreground">Score Tracked</p>
              <p className="text-[11px] text-muted-foreground">Your score will be recorded and compared with other participants.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-neon-pink" />
            <div>
              <p className="text-xs font-medium text-foreground">Anti-Cheat Active</p>
              <p className="text-[11px] text-muted-foreground">Your session is monitored. Any suspicious activity will be flagged.</p>
            </div>
          </div>

          {isPaidContest && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  Entry Fee: <span className="text-yellow-400">${(feeCents / 100).toFixed(2)}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Clicking 'Start Playing' will deduct this from your wallet.
                </p>
              </div>
            </div>
          )}

          {/* Inline error for insufficient balance or deduction failure */}
          {deductError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
              <p className="text-[11px] font-medium text-destructive">{deductError}</p>
            </div>
          )}
        </div>

        {/* Only show "don't remind me" for free contests */}
        {!isPaidContest && (
          <div className="flex items-center gap-2 py-1">
            <Checkbox id="dont-remind" checked={dontRemind} onCheckedChange={(v) => setDontRemind(!!v)} />
            <label htmlFor="dont-remind" className="text-[11px] text-muted-foreground cursor-pointer select-none">
              Don't remind me again
            </label>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeducting}
            className="flex-1 gap-2 font-arcade text-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Button>
          <Button
            onClick={handleAccept}
            disabled={isDeducting}
            className="flex-1 gap-2 bg-neon-pink text-white hover:bg-neon-pink/80 font-arcade text-xs neon-border-pink"
          >
            {isDeducting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isPaidContest ? "Deducting..." : "Starting..."}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Start Playing
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContestRulesModal;
