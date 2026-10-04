import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { resolveSendCodeError, resolveVerifyCodeError } from "@/pages/VerifyAccount";

describe("resolveSendCodeError", () => {
  it("maps captcha failures to a friendly message", () => {
    expect(resolveSendCodeError({ code: "captcha_failed" })).toBe("Verification failed, please try again.");
  });

  it("maps email rate limits", () => {
    expect(resolveSendCodeError({ code: "over_email_send_rate_limit" })).toMatch(/wait a minute/i);
  });

  it("falls back to the raw message", () => {
    expect(resolveSendCodeError({ message: "boom" })).toBe("boom");
  });
});

describe("resolveVerifyCodeError", () => {
  it("maps expired codes", () => {
    expect(resolveVerifyCodeError({ code: "otp_expired" })).toMatch(/wrong or has expired/i);
  });

  it("maps invalid codes by message", () => {
    expect(resolveVerifyCodeError({ message: "Token is invalid" })).toMatch(/wrong or has expired/i);
  });
});
