import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

export interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface OnboardingTourProps {
  steps: TourStep[];
  storageKey: string;
  onComplete?: () => void;
}

const PADDING = 8;

const OnboardingTour = ({ steps, storageKey, onComplete }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (localStorage.getItem(storageKey) === "true") return;
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, [storageKey]);

  const updateRect = useCallback(() => {
    const step = steps[currentStep];
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      setRect(null);
    }
  }, [currentStep, steps]);

  useEffect(() => {
    if (!visible) return;
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [visible, updateRect]);

  const finish = useCallback(() => {
    localStorage.setItem(storageKey, "true");
    setVisible(false);
    onComplete?.();
  }, [storageKey, onComplete]);

  const next = () => {
    if (currentStep >= steps.length - 1) finish();
    else setCurrentStep((s) => s + 1);
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  if (!visible) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  // Calculate tooltip position, clamped to viewport
  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }

    const TOOLTIP_W = 320;
    const TOOLTIP_H = 200;
    const MARGIN = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const pos = step.position ?? "bottom";
    let top: number | undefined;
    let left: number | undefined;

    switch (pos) {
      case "bottom":
        top = rect.bottom + PADDING + 8;
        left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
        break;
      case "top":
        top = rect.top - PADDING - 8 - TOOLTIP_H;
        left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
        break;
      case "right":
        top = rect.top + rect.height / 2 - TOOLTIP_H / 2;
        left = rect.right + PADDING + 8;
        break;
      case "left":
        top = rect.top + rect.height / 2 - TOOLTIP_H / 2;
        left = rect.left - PADDING - 8 - TOOLTIP_W;
        break;
      default:
        top = rect.bottom + PADDING + 8;
        left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
    }

    // Clamp to viewport
    if (left < MARGIN) left = MARGIN;
    if (left + TOOLTIP_W > vw - MARGIN) left = vw - MARGIN - TOOLTIP_W;
    if (top < MARGIN) top = MARGIN;
    if (top + TOOLTIP_H > vh - MARGIN) top = vh - MARGIN - TOOLTIP_H;

    return { top, left };
  };

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "none", marginTop: 0 }}>
      {/* Backdrop with cutout */}
      <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: "auto" }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - PADDING}
                y={rect.top - PADDING}
                width={rect.width + PADDING * 2}
                height={rect.height + PADDING * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#tour-mask)" />
      </svg>

      {/* Highlight border */}
      {rect && (
        <div
          className="absolute rounded-lg border-2 border-primary shadow-[0_0_15px_hsl(var(--primary)/0.4)] transition-all duration-300"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-[10000] w-80 max-w-[90vw] rounded-xl border border-border bg-card p-5 shadow-2xl"
        style={{ ...getTooltipStyle(), pointerEvents: "auto" }}
      >
        <button
          onClick={finish}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-[10px] text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        <h3 className="mb-2 font-arcade text-[11px] text-foreground">{step.title}</h3>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{step.description}</p>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={finish} className="text-xs text-muted-foreground">
            Skip Tour
          </Button>
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={prev} className="gap-1 text-xs">
                <ChevronLeft className="h-3 w-3" /> Back
              </Button>
            )}
            <Button size="sm" onClick={next} className="gap-1 text-xs bg-primary text-primary-foreground">
              {isLast ? "Finish" : "Next"} {!isLast && <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
