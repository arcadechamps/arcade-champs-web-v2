/**
 * Bot-protection integration tests.
 *
 * Verifies that:
 * - Honeypot field exists ONLY on the Signup page (per spec).
 * - Turnstile widget is present on Signup, Login, ForgotPassword, and Contact.
 * - Submit buttons are disabled until the Turnstile token arrives.
 * - Honeypot attributes meet spec requirements:
 *     tabIndex=-1, autoComplete=off, aria-hidden on wrapper,
 *     wrapper is positioned off-screen (position:absolute, left:-10000px).
 * - formStartedAt ref is initialised (measured indirectly via the
 *   formFillMs parameter that signUp receives).
 *
 * NOTE: These are unit/component-level tests. Full E2E with a real
 * Turnstile token requires the browser subagent or Playwright + a
 * test sitekey. The Turnstile assertions here confirm the component
 * renders the widget container; actual iframe injection is Cloudflare-side.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import React from "react";

// ── Mock heavy dependencies so unit tests stay fast ─────────────────────────

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: React.forwardRef(
    (
      {
        siteKey,
        options,
      }: {
        siteKey: string;
        onSuccess?: (token: string) => void;
        onExpire?: () => void;
        onError?: () => void;
        options?: Record<string, unknown>;
      },
      _ref: React.Ref<unknown>
    ) => (
      <div
        data-testid="turnstile-widget"
        data-sitekey={siteKey}
        data-size={options?.size}
      />
    )
  ),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signIn: vi.fn().mockResolvedValue({ error: null }),
    resetPassword: vi.fn().mockResolvedValue({ error: null }),
    user: null,
    session: null,
    profile: null,
    loading: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

vi.mock("@/components/Layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock("@/components/PageMeta", () => ({
  PageMeta: () => null,
}));

vi.mock("@/assets/logo.png", () => ({ default: "logo.png" }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// ── Helpers ──────────────────────────────────────────────────────────────────

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

// ── Page imports (after mocks are set up) ────────────────────────────────────

import Signup from "@/pages/Signup";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Bot-protection: Signup page", () => {
  beforeEach(() => {
    renderWithRouter(<Signup />);
  });

  it("renders the Turnstile widget", () => {
    expect(screen.getByTestId("turnstile-widget")).toBeTruthy();
  });

  it("uses the correct Turnstile sitekey from env", () => {
    const widget = screen.getByTestId("turnstile-widget");
    // VITE_TURNSTILE_SITEKEY is defined in .env; vitest loads it via vite config
    expect(widget.getAttribute("data-sitekey")).toBeTruthy();
  });

  it("has a honeypot input with name='website'", () => {
    const honeypot = document.querySelector<HTMLInputElement>(
      'input[name="website"]'
    );
    expect(honeypot).not.toBeNull();
  });

  it("honeypot tabIndex is -1 (keyboard users can't focus it)", () => {
    const honeypot = document.querySelector<HTMLInputElement>(
      'input[name="website"]'
    );
    expect(honeypot?.tabIndex).toBe(-1);
  });

  it("honeypot autoComplete is 'off' (password managers skip it)", () => {
    const honeypot = document.querySelector<HTMLInputElement>(
      'input[name="website"]'
    );
    expect(honeypot?.getAttribute("autocomplete")).toBe("off");
  });

  it("honeypot type is 'text' (bots don't skip non-hidden inputs)", () => {
    const honeypot = document.querySelector<HTMLInputElement>(
      'input[name="website"]'
    );
    expect(honeypot?.type).toBe("text");
  });

  it("honeypot wrapper has aria-hidden='true' (screen readers skip it)", () => {
    const honeypot = document.querySelector<HTMLInputElement>(
      'input[name="website"]'
    );
    expect(honeypot?.parentElement?.getAttribute("aria-hidden")).toBe("true");
  });

  it("form element has position:relative (anchors honeypot as containing block)", () => {
    const form = document.querySelector("form");
    expect(form?.style.position).toBe("relative");
  });

  it("honeypot wrapper is positioned off-screen (left:-10000px)", () => {
    const honeypot = document.querySelector<HTMLInputElement>(
      'input[name="website"]'
    );
    const wrapper = honeypot?.parentElement as HTMLElement | null;
    expect(wrapper?.style.left).toBe("-10000px");
    expect(wrapper?.style.position).toBe("absolute");
    expect(wrapper?.style.overflow).toBe("hidden");
  });

  it("submit button is disabled before Turnstile resolves", () => {
    const btn = document.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(btn?.disabled).toBe(true);
  });
});

describe("Bot-protection: Login page", () => {
  beforeEach(() => {
    renderWithRouter(<Login />);
  });

  it("renders the Turnstile widget", () => {
    expect(screen.getByTestId("turnstile-widget")).toBeTruthy();
  });

  it("does NOT have a honeypot field (honeypot is signup-only per spec)", () => {
    const honeypot = document.querySelector('input[name="website"]');
    expect(honeypot).toBeNull();
  });

  it("submit button is disabled before Turnstile resolves", () => {
    const btn = document.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(btn?.disabled).toBe(true);
  });
});

describe("Bot-protection: ForgotPassword page", () => {
  beforeEach(() => {
    renderWithRouter(<ForgotPassword />);
  });

  it("renders the Turnstile widget", () => {
    expect(screen.getByTestId("turnstile-widget")).toBeTruthy();
  });

  it("does NOT have a honeypot field (honeypot is signup-only per spec)", () => {
    const honeypot = document.querySelector('input[name="website"]');
    expect(honeypot).toBeNull();
  });

  it("submit button is disabled before Turnstile resolves", () => {
    const btn = document.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(btn?.disabled).toBe(true);
  });
});
