import { useEffect, useRef, useCallback } from "react";

type RevealVariant = "fade-up" | "fade-left" | "fade-right" | "scale-in";

interface ScrollRevealOptions {
  variant?: RevealVariant;
  delay?: number;
  threshold?: number;
  once?: boolean;
}

const variantClass: Record<RevealVariant, string> = {
  "fade-up": "sr-fade-up",
  "fade-left": "sr-fade-left",
  "fade-right": "sr-fade-right",
  "scale-in": "sr-scale-in",
};

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  variant = "fade-up",
  delay = 0,
  threshold = 0.15,
  once = true,
}: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      el.classList.add("sr-visible");
      return;
    }

    // Set initial hidden state + variant
    el.classList.add("sr-hidden", variantClass[variant]);
    if (delay > 0) {
      el.style.transitionDelay = `${delay}ms`;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove("sr-hidden");
          el.classList.add("sr-visible");
          if (once) observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [variant, delay, threshold, once]);

  return ref;
}

/** Helper to generate staggered delay for items in a list */
export function staggerDelay(index: number, base = 80) {
  return index * base;
}
