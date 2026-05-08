import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getKeyMappingWithDb, type KeyMapping, type DbKeymapping } from "@/data/keymappings";

interface KeymapOverlayProps {
  gameSlug: string;
  core: string;
  dbKeymapping?: DbKeymapping | null;
}

/** 3D-styled keyboard keycap with action label */
const Keycap = ({ label, action, wide }: { label: string; action: string; wide?: boolean }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span
      className={`inline-flex items-center justify-center rounded-md border border-border bg-secondary/80 font-mono text-[10px] font-bold text-foreground shadow-[0_3px_0_0_hsl(var(--border)),inset_0_-1px_0_0_hsl(var(--border)/0.3)] ${
        wide ? "min-w-[2.5rem] px-2 py-1" : "min-w-[1.6rem] px-1.5 py-1"
      }`}
    >
      {label}
    </span>
    <span className="text-[7px] text-muted-foreground/70 max-w-[3rem] truncate text-center">{action}</span>
  </div>
);

/** Styled keyboard key badge */
const Key = ({ label }: { label: string }) => (
  <span className="inline-flex items-center justify-center rounded-md border border-border bg-secondary/60 font-mono text-[10px] font-bold text-foreground shadow-[0_2px_0_0_hsl(var(--border))] min-w-[1.5rem] px-1.5 py-0.5">
    {label}
  </span>
);

/** Check if a key value is meaningfully set */
const isKeySet = (val?: string) => val != null && val !== "" && val !== "-";

const KeymapOverlay = ({ gameSlug, core, dbKeymapping }: KeymapOverlayProps) => {
  const mapping: KeyMapping = getKeyMappingWithDb(gameSlug, core, dbKeymapping);

  const hasDpad = isKeySet(mapping.up) || isKeySet(mapping.down) || isKeySet(mapping.left) || isKeySet(mapping.right);
  const hasActions = isKeySet(mapping.a) || isKeySet(mapping.b);
  const hasSystem = isKeySet(mapping.start) || isKeySet(mapping.select);
  const hasExtras = mapping.extras && mapping.extras.length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="mb-1 h-7 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <Gamepad2 className="h-3 w-3" />
          Controls
        </Button>
      </DialogTrigger>

      <DialogContent className="w-64 max-w-[90vw] rounded-lg border border-border/50 bg-card/95 p-4 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-center font-arcade text-[10px] tracking-wider text-muted-foreground">
            CONTROLS
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">

          {/* ── GAMEPAD SECTION ── */}
          <div className="flex items-start justify-between gap-3">
            {/* Left side: D-Pad */}
            {hasDpad && (
              <div className="flex flex-col items-center gap-0.5">
                <p className="mb-1 text-[8px] uppercase tracking-wider text-muted-foreground">D-Pad</p>
                <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
                  <div />
                  {/* Up */}
                  <div className="flex flex-col items-center">
                    {isKeySet(mapping.up) ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-sm border border-primary/40 bg-primary/5">
                        <span className="text-[9px] font-bold text-primary">{mapping.up}</span>
                      </div>
                    ) : <div className="h-6 w-6" />}
                  </div>
                  <div />
                  {/* Left */}
                  <div className="flex items-center justify-center">
                    {isKeySet(mapping.left) ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-sm border border-primary/40 bg-primary/5">
                        <span className="text-[9px] font-bold text-primary">{mapping.left}</span>
                      </div>
                    ) : <div className="h-6 w-6" />}
                  </div>
                  {/* Center cross */}
                  <div className="flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-border/60" />
                  </div>
                  {/* Right */}
                  <div className="flex items-center justify-center">
                    {isKeySet(mapping.right) ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-sm border border-primary/40 bg-primary/5">
                        <span className="text-[9px] font-bold text-primary">{mapping.right}</span>
                      </div>
                    ) : <div className="h-6 w-6" />}
                  </div>
                  <div />
                  {/* Down */}
                  <div className="flex flex-col items-center">
                    {isKeySet(mapping.down) ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-sm border border-primary/40 bg-primary/5">
                        <span className="text-[9px] font-bold text-primary">{mapping.down}</span>
                      </div>
                    ) : <div className="h-6 w-6" />}
                  </div>
                  <div />
                </div>
              </div>
            )}

            {/* Right side: Action Buttons */}
            {hasActions && (
              <div className="flex flex-col items-center gap-2">
                <p className="mb-1 text-[8px] uppercase tracking-wider text-muted-foreground">
                  Buttons
                </p>
                <div className="flex items-center gap-2">
                  {/* B Button */}
                  {isKeySet(mapping.b) && (
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent bg-accent/10 shadow-[0_0_8px_hsl(var(--accent)/0.3)]">
                        <span className="text-[9px] font-bold text-accent">{mapping.b}</span>
                      </div>
                      <span className="text-[7px] text-accent/70 max-w-[2.5rem] truncate">{mapping.bAction || "B"}</span>
                    </div>
                  )}
                  {/* A Button */}
                  {isKeySet(mapping.a) && (
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-primary/10 shadow-[0_0_8px_hsl(var(--primary)/0.3)]">
                        <span className="text-[9px] font-bold text-primary">{mapping.a}</span>
                      </div>
                      <span className="text-[7px] text-primary/70 max-w-[2.5rem] truncate">{mapping.aAction || "A"}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Start / Select */}
          {hasSystem && (
            <div className="mt-3 flex items-center justify-center gap-3">
              {isKeySet(mapping.select) && (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex h-4 w-10 items-center justify-center rounded-full border border-muted-foreground/40 bg-muted/30">
                    <span className="text-[7px] font-semibold text-muted-foreground">{mapping.select}</span>
                  </div>
                  <span className="text-[7px] text-muted-foreground/60">{mapping.selectAction || "SELECT"}</span>
                </div>
              )}
              {isKeySet(mapping.start) && (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex h-4 w-10 items-center justify-center rounded-full border border-muted-foreground/40 bg-muted/30">
                    <span className="text-[7px] font-semibold text-muted-foreground">{mapping.start}</span>
                  </div>
                  <span className="text-[7px] text-muted-foreground/60">{mapping.startAction || "START"}</span>
                </div>
              )}
            </div>
          )}

          {/* Extra buttons */}
          {hasExtras && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 border-t border-border/30 pt-2">
              {mapping.extras!.map((extra) => (
                <div key={extra.label} className="flex items-center gap-1">
                  <Key label={extra.key} />
                  <span className="text-[8px] text-muted-foreground">{extra.action || extra.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── KEYBOARD SECTION ── */}
          <div className="mt-3 border-t border-border/30 pt-3">
            <p className="mb-2 text-center font-arcade text-[8px] tracking-wider text-muted-foreground">
              KEYBOARD
            </p>

            {/* Compact horizontal layout: Arrows | Actions | System */}
            <div className="flex items-start justify-between gap-2">
              {/* Arrow keys – compact inverted T */}
              {hasDpad && (
                <div className="flex flex-col items-center gap-0.5">
                  {isKeySet(mapping.up) && <Keycap label={mapping.up} action={mapping.upAction || "Up"} />}
                  <div className="flex gap-0.5">
                    {isKeySet(mapping.left) && <Keycap label={mapping.left} action={mapping.leftAction || "Left"} />}
                    {isKeySet(mapping.down) && <Keycap label={mapping.down} action={mapping.downAction || "Down"} />}
                    {isKeySet(mapping.right) && <Keycap label={mapping.right} action={mapping.rightAction || "Right"} />}
                  </div>
                </div>
              )}

              {/* Action + System keys – stacked compactly */}
              <div className="flex flex-col items-center gap-1">
                {hasActions && (
                  <div className="flex items-start gap-1.5">
                    {isKeySet(mapping.b) && <Keycap label={mapping.b} action={mapping.bAction || "B"} />}
                    {isKeySet(mapping.a) && <Keycap label={mapping.a} action={mapping.aAction || "A"} />}
                  </div>
                )}
                {hasSystem && (
                  <div className="flex items-start gap-1.5">
                    {isKeySet(mapping.start) && <Keycap label={mapping.start} action={mapping.startAction || "Start"} wide />}
                    {isKeySet(mapping.select) && <Keycap label={mapping.select} action={mapping.selectAction || "Select"} wide />}
                  </div>
                )}
              </div>
            </div>

            {/* Extra keys */}
            {hasExtras && (
              <div className="mt-1.5 flex flex-wrap items-start justify-center gap-1.5">
                {mapping.extras!.map((e) => (
                  <Keycap key={e.label} label={e.key} action={e.action || e.label} />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeymapOverlay;
