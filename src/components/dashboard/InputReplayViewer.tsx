import { useMemo } from "react";
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  CornerDownLeft, Space, Gamepad2, Keyboard,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface InputEvent {
  t: string;       // "key" | "pad"
  k?: string;      // key name
  c?: string;      // key code
  b?: number;      // gamepad button index
  ts: number;      // ms relative to session start
}

interface InputReplayViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputLog: InputEvent[];
  playerName?: string;
}

// ── Format timestamp as M:SS.s ──
const fmtTs = (ms: number) => {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toFixed(1);
  return `${m}:${s.padStart(4, "0")}`;
};

// ── Gamepad button labels ──
const GAMEPAD_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "A", color: "bg-green-600" },
  1: { label: "B", color: "bg-red-600" },
  2: { label: "X", color: "bg-blue-600" },
  3: { label: "Y", color: "bg-yellow-500" },
  4: { label: "LB", color: "bg-muted" },
  5: { label: "RB", color: "bg-muted" },
  6: { label: "LT", color: "bg-muted" },
  7: { label: "RT", color: "bg-muted" },
  8: { label: "Back", color: "bg-muted" },
  9: { label: "Start", color: "bg-muted" },
  10: { label: "L3", color: "bg-muted" },
  11: { label: "R3", color: "bg-muted" },
  12: { label: "▲", color: "bg-muted" },
  13: { label: "▼", color: "bg-muted" },
  14: { label: "◄", color: "bg-muted" },
  15: { label: "►", color: "bg-muted" },
};

// ── Render a single key event ──
const KeyIcon = ({ code, keyName }: { code?: string; keyName?: string }) => {
  const c = code ?? "";
  const k = keyName ?? "";

  if (c === "ArrowUp" || k === "ArrowUp") return <ArrowUp className="h-4 w-4" />;
  if (c === "ArrowDown" || k === "ArrowDown") return <ArrowDown className="h-4 w-4" />;
  if (c === "ArrowLeft" || k === "ArrowLeft") return <ArrowLeft className="h-4 w-4" />;
  if (c === "ArrowRight" || k === "ArrowRight") return <ArrowRight className="h-4 w-4" />;
  if (c === "Enter" || k === "Enter") return <CornerDownLeft className="h-4 w-4" />;
  if (c === "Space" || k === " ") return <Space className="h-4 w-4" />;

  // Modifier keys
  if (k === "Shift" || k === "Control" || k === "Alt" || k === "Meta") {
    return (
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
        {k === "Control" ? "Ctrl" : k === "Meta" ? "⌘" : k}
      </span>
    );
  }

  // Single character
  const display = k.length === 1 ? k.toUpperCase() : k || c;
  return (
    <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-secondary px-1 text-[11px] font-mono font-semibold text-foreground shadow-sm">
      {display}
    </kbd>
  );
};

// ── Gamepad button badge ──
const GamepadButton = ({ button }: { button: number }) => {
  const info = GAMEPAD_LABELS[button] ?? { label: `B${button}`, color: "bg-muted" };
  return (
    <span className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full ${info.color} px-1.5 text-[10px] font-bold text-white shadow-sm`}>
      {info.label}
    </span>
  );
};

// ── Group events within 100ms ──
interface EventCluster {
  startTs: number;
  events: InputEvent[];
}

function clusterEvents(log: InputEvent[]): EventCluster[] {
  if (log.length === 0) return [];
  const clusters: EventCluster[] = [];
  let current: EventCluster = { startTs: log[0].ts, events: [log[0]] };

  for (let i = 1; i < log.length; i++) {
    if (log[i].ts - current.events[current.events.length - 1].ts < 100) {
      current.events.push(log[i]);
    } else {
      clusters.push(current);
      current = { startTs: log[i].ts, events: [log[i]] };
    }
  }
  clusters.push(current);
  return clusters;
}

const InputReplayViewer = ({ open, onOpenChange, inputLog, playerName }: InputReplayViewerProps) => {
  const clusters = useMemo(() => clusterEvents(inputLog), [inputLog]);

  const stats = useMemo(() => {
    const total = inputLog.length;
    const keys = inputLog.filter(e => e.t === "key").length;
    const pads = inputLog.filter(e => e.t === "pad").length;
    const durationMs = total > 1 ? inputLog[total - 1].ts - inputLog[0].ts : 0;
    const aps = durationMs > 0 ? (total / (durationMs / 1000)).toFixed(1) : "—";
    return { total, keys, pads, aps };
  }, [inputLog]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Keyboard className="h-5 w-5 text-primary" />
            Input Replay {playerName ? `— ${playerName}` : ""}
          </DialogTitle>
          <DialogDescription>
            Recorded keyboard and gamepad inputs during the gameplay session.
          </DialogDescription>
        </DialogHeader>

        {/* Summary stats */}
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
            {stats.total} inputs
          </Badge>
          <Badge variant="outline" className="gap-1 border-neon-green/30 text-neon-green">
            {stats.aps} actions/sec
          </Badge>
          {stats.keys > 0 && (
            <Badge variant="outline" className="gap-1 border-border text-muted-foreground">
              <Keyboard className="h-3 w-3" /> {stats.keys} keys
            </Badge>
          )}
          {stats.pads > 0 && (
            <Badge variant="outline" className="gap-1 border-border text-muted-foreground">
              <Gamepad2 className="h-3 w-3" /> {stats.pads} gamepad
            </Badge>
          )}
        </div>

        {/* Timeline */}
        <ScrollArea className="h-[400px] rounded-lg border border-border/50 bg-secondary/20 p-3">
          {clusters.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No input data recorded for this session.</p>
          ) : (
            <div className="space-y-1">
              {clusters.map((cluster, ci) => (
                <div key={ci} className="flex items-start gap-3 rounded px-2 py-1 transition-colors hover:bg-secondary/40">
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted-foreground w-14 text-right">
                    {fmtTs(cluster.startTs)}
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {cluster.events.map((evt, ei) =>
                      evt.t === "key" ? (
                        <KeyIcon key={ei} code={evt.c} keyName={evt.k} />
                      ) : (
                        <GamepadButton key={ei} button={evt.b ?? 0} />
                      )
                    )}
                    {cluster.events.length > 3 && (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        ×{cluster.events.length}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default InputReplayViewer;
