# Agent Log — Arcade Champs

---

## 2026-10-01 | Cloudflare Turnstile Integration (Phase 1)

**What was implemented:**
Integrated Cloudflare Turnstile bot-protection widget across all four public form surfaces — Login, Signup, Forgot Password, and Contact Form — following the spec in docs/arcade_champs_turnstile_and_honeypot_frontend_setup.md.

**Changes made:**
- Installed @marsidev/react-turnstile@1.6.1 via Bun.
- Updated useAuth.tsx: added optional captchaToken parameter to signIn, signUp, and resetPassword; signUp also now accepts honeypotValue and formFillMs and passes them as hp and form_fill_ms in Supabase metadata.
- Login.tsx: Added Turnstile widget with useRef reset pattern; submit disabled until token available; CAPTCHA error mapped to friendly string.
- Signup.tsx: Added Turnstile + honeypot field (absolutely off-screen, tabIndex=-1, autoComplete=off, aria-hidden) + formStartedAt ref measuring fill duration. Backend error codes disposable_email, rate_limited, signup_blocked mapped to user-friendly messages.
- ForgotPassword.tsx: Added Turnstile widget with same reset pattern; button disabled until verified.
- ContactForm.tsx: Migrated from react-google-recaptcha-v3 to Turnstile; widget resets in finally block.
- ContactUs.tsx: Removed GoogleReCaptchaProvider wrapper.

**Problem:** Forms had no frontend bot-protection; backend was waiting on the Turnstile token.

**Solution:** Wired @marsidev/react-turnstile into all four surfaces with single-use token lifecycle, button guard, and error message mapping per spec. CAPTCHA is NOT yet enabled in Supabase — deploy first, then enable with backend engineer per rollout order in spec.

**Build:** vite build passed (2988 modules, 1m 5s). No new TypeScript errors introduced.

---

## 2026-10-01 | Honeypot Phase - DOM Verification & Fix

**What was implemented:**
Fixed the honeypot field's positioning context in Signup.tsx. The field had been placed inside <CardFooter> with position:absolute but no established containing block. Moved it to be a direct child of <form style={{ position: 'relative' }}> so the absolute -10000px offset is properly anchored to the form element, not the viewport.

**Problem:** The honeypot <div position:absolute left:-10000px> was inside <CardFooter> which has no position:relative — the browser anchors the absolutly-positioned element to the nearest positioned ancestor, which could be the viewport. Functionally it still worked, but the behaviour was undefined and inconsistent.

**Solution:** Added position:relative to the <form> element and moved the honeypot as the first child of <form>, before CardContent/CardFooter. Browser subagent verified via live DOM inspection: exists=true, tabIndex=-1, autoComplete=off, parent position=absolute, parent left=-10000px, parent overflow=hidden. Tab order test confirmed honeypot is NEVER focused (Display Name → Email → Password → Turnstile → Button).

---

## 2026-10-04 | Bot Protection + Dormant Accounts Frontend

**What was implemented:** ChangePasswordCard now sends a single-use Turnstile token with the current-password re-auth; new /verify-account OTP screen plus a my_reverify_status guard in ProtectedRoute (useReverifyStatus hook); admin Security section (summary cards, signup chart, security log, players table with reminders, reminder settings, CAPTCHA placeholder) via useAdminSecurity hooks; .example.env switched to VITE_TURNSTILE_SITEKEY and react-google-recaptcha-v3 removed.

**Solution:** Wired Turnstile into the re-auth call, added the OTP flow and guard, and built the admin screens against the backend RPCs. Vitest passes (86 tests); manual testing with a flagged test account is still pending.

---

## 2026-10-04 14:20 | Fix Vite Dev Server ENOENT Error on Stale reCAPTCHA Dependency

**What was implemented:**
Cleared the stale Vite pre-bundled dependency cache in `node_modules/.vite` and restarted the Vite development server with `--force`.

**Problem:**
Starting the Vite dev server failed with `Error: ENOENT: no such file or directory, open '...node_modules\react-google-recaptcha-v3\dist\react-google-recaptcha-v3.esm.js'` because `react-google-recaptcha-v3` had been uninstalled during Turnstile migration, but Vite's cached dependency metadata (`node_modules/.vite/deps/_metadata.json`) still referenced its deleted entry point.

**Solution:**
Purged the obsolete `node_modules/.vite` cache directory and executed `bun run dev -- --force` to regenerate a clean dependency cache reflecting current packages. Verified successful production build (`bun run build`) and live dev server page render at `http://localhost:8080/`.

---

## 2026-10-04 15:15 | Redirect Authenticated Users Away From Guest Auth Routes

**What was implemented:**
Created a reusable `GuestRoute` component that protects authentication-only pages (`/login`, `/signup`, `/forgot-password`) by redirecting authenticated users to `/dashboard` (or their intended destination). Updated `App.tsx` routes to wrap `/login`, `/signup`, and `/forgot-password` with `<GuestRoute>`, and added unit tests in `guest-route.test.tsx` covering all redirect conditions and loop-prevention edge cases.

**Problem:**
Authenticated users were able to directly navigate to and view `/login`, `/signup`, and `/forgot-password`, leading to poor UX and confusing interface states.

**Solution:**
Implemented `GuestRoute` following Clean Code and Single Responsibility principles to inspect `user` and `loading` states from `useAuth()`. It renders `null` during auth loading to eliminate UI flashes, renders the guest form when signed out, and redirects signed-in users immediately to `/dashboard` (or safe `location.state.from` path if non-auth), preventing redirect loops and blocking unwanted access.

