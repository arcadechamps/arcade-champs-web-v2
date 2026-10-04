# Arcade Champs: Frontend To-Do
**Bot protection + dormant accounts**
*From Hamza to Danjuma | 3 Oct 2026*

The backend is finished and live. Everything below is frontend work, and it's the only thing blocking us from switching the dormant-account system on. All the database functions exist and are tested. You only need to call them with the Supabase client you already use (`supabase.rpc(...)`). Pull latest `main` first: I pushed an update to `supabase/functions/send-contact-email/index.ts`.

## Priority order

| # | Task | Why | Status |
|---|---|---|---|
| 1 | Change Password: add Turnstile | Broken for users right now since CAPTCHA went on | URGENT, today |
| 2 | Re-verification code screen | Dormant detection can't be switched on without it | High |
| 3 | Admin dashboard: Security section | Client deliverable: metrics, dormant users, reminders | High |
| 4 | Small cleanups (`.example.env` etc.) | Housekeeping | Normal |
| | Cloudflare captcha stats card | Hamza is sending the Cloudflare API details soon | Placeholder for now |

## What's already done (backend)
* CAPTCHA is ON in Supabase. Any auth call without a Turnstile token now fails with `captcha_failed`.
* Signup hook: disposable email block, honeypot, timing check, IP rate limit. All logged.
* Contact form edge function now verifies Turnstile (it was still on Google reCAPTCHA). Fixed and deployed.
* Login tracking, 30-day dormant detection (daily), OTP re-verification flag, reminder emails, and all admin functions are live. Detection and reminders are still switched off until your screens are ready.

---

## 1. Change Password: add Turnstile (URGENT)
File: `src/components/dashboard/ChangePasswordCard.tsx`. It re-checks the current password with `signInWithPassword` but sends no captcha token, so Supabase rejects it and the user sees "Current password is incorrect" even when it's right. Same pattern as `Login.tsx`:
* Add the `<Turnstile />` widget (`VITE_TURNSTILE_SITEKEY`) and keep the token in state.
* Pass it: `signInWithPassword({ email, password, options: { captchaToken } })`.
* Disable Save until there's a token. Reset the widget and clear the token after every attempt (tokens are single-use).

## 2. Re-verification code screen
When an account has been inactive 30+ days, the backend flags it. At the next login the player must confirm a 6-digit code sent to their email, once. No hard lockout: they can always request a new code. The flag is cleared automatically on the backend when they log in with the code. You don't need to call anything to clear it.

### Where it goes
* New route `/verify-account`.
* In `ProtectedRoute` (`App.tsx`), once the user is loaded, call `supabase.rpc('my_reverify_status')`. If it returns true, redirect to `/verify-account` (remember where they were going). This covers dashboard, contest play and payments in one place.
* Cache the result for the session so you're not calling it on every route change, but re-check after verifying.

### Flow on the screen

```typescript
// 1) user solves Turnstile, clicks "Send code"
const { error } = await supabase.auth.signInWithOtp({
  email: user.email,
  options: { captchaToken, shouldCreateUser: false },
});

// 2) user types the 6-digit code from the email
const { error: verr } = await supabase.auth.verifyOtp({
  email: user.email,
  token: code, // 6 digits
  type: 'email',
});

// 3) on success: re-check, then continue to where they were going
const { data: stillFlagged } = await supabase.rpc('my_reverify_status');
if (!stillFlagged) navigate(redirectTo ?? '/dashboard');
```

* Turnstile is required on this screen (`signInWithOtp` needs a token). `verifyOtp` does not need one.
* Resend button: 60-second cooldown, needs a fresh Turnstile token each time.
* Errors to handle: wrong or expired code (`otp_expired`/`invalid`), `captcha_failed`, `over_email_send_rate_limit` ("too many requests, wait a minute").
* Copy suggestion: "For your security, we've sent a 6-digit code to you@email.com. Enter it below to continue."
* Add a "Log out" link on the screen as the escape hatch. Don't let them skip to the dashboard.
* The email template (Magic Link) already shows the 6-digit code. I pasted it in Supabase.

**Testing:** tell me when it's on a branch or preview and I'll flag a test account for you, so you can run the full flow without touching real players.

## 3. Admin dashboard: new "Security" section
Add a sidebar item to `adminItems` (key `security`/`/dashboard/admin/security`). Every function below checks admin on the backend. Non-admins get the error `not authorized`, logged-out users get `permission denied`. Never use the `service_role` key in the frontend.

### 3a. Summary cards: admin_dormant_summary()
```typescript
const { data } = await supabase.rpc('admin_dormant_summary'); // returns one JSON object
```

| Key | Meaning |
|---|---|
| `total_users`, `confirmed`, `unverified` | All accounts / email confirmed / never confirmed |
| `active`, `inactive` | Confirmed users active vs inactive for inactive days (30) days |
| `flagged_dormant`, `pending_reverification`, `reverified` | Flag counts from the dormant system |
| `logins_today`, `logins_30d` | From login tracking (started 3 Oct, so counts grow from there) |
| `reminders_pending`, `reminders_sent_30d` | Reminder email counts |
| `detection_enabled`, `reminders_enabled` | Show as status badges (on/off) |
| `last_run` | Last real dormant check `{ran_at, candidates, newly_flagged, cleared, reminders_queued}` or null |
| `login_tracking_since` | Show a small note: "Login history since <date>" |

### 3b. Signup protection chart: admin_signup_metrics(p_from, p_to)
```typescript
const { data } = await supabase.rpc('admin_signup_metrics', {
  p_from: from.toISOString(), p_to: to.toISOString(), // defaults: last 30 days
});
// rows: { day, total, allowed, blocked, disposable_email, honeypot,
// too_fast, missing_fields, rate_limited } (one row per UTC day)
```
Stacked bar or line chart: allowed vs blocked per day, plus totals by block reason. Date-range picker (7/30/90 days).

### 3c. Security log table: security_logs view
```typescript
const { data, count } = await supabase.from('security_logs')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false })
  .range(from, to);
// columns: id, created_at, event, blocked (bool), reason (readable text),
// provider, email_domain, ip_address, fill_ms
```
Paginated table. Red badge when `blocked` is true. Optional filter: blocked only.

### 3d. Players table: admin_list_users(filter, search, limit, offset)
```typescript
const { data } = await supabase.rpc('admin_list_users', {
  p_filter: 'dormant', // 'all' | 'active' | 'dormant' | 'unverified' | 'reverify'
  p_search: 'john', // email / username / display name, optional
  p_limit: 50, // max 200
  p_offset: 0,
});
const total = data?.[0]?.total_count ?? 0; // for pagination
```

| Column | Show as |
|---|---|
| `email`, `username`, `display_name` | Player |
| `created_at`, `last_sign_in_at`, `days_inactive` | Joined / last seen / "34 days" |
| `email_confirmed`, `is_dormant`, `reverify_required` | Badges (Unverified / Dormant / Needs code) |
| `logins_30d`, `logins_90d` | Login frequency |
| `reminder_count`, `last_reminder_at`, `reminder_pending` | Reminders sent / last sent / "queued" badge |
| `dormant_since`, `reverified_at`, `is_admin` | Detail view / tooltip |
| `user_id`, `total_count` | Row key / pagination |

Filter tabs across the top, search box, pagination, and row checkboxes for 3e.

### 3e. Send reminder: admin_send_reminder(user_ids)
```typescript
const { data } = await supabase.rpc('admin_send_reminder', { p_user_ids: selectedIds }); // max 500
// { requested: 12, queued: 10, skipped: 2} -> toast: "10 reminders queued, 2 skipped"
```
This only queues them. A backend job sends queued emails every 10 minutes. Admins, unconfirmed users and anyone already queued are skipped automatically, and so are users who hit the max or got one too recently. Confirm before sending ("Send reminder to 12 players?"). Best used from the Dormant tab.

### 3f. Reminder settings: admin_get_reminder_settings() / admin_set_reminder_settings(...)
```typescript
const { data: settings } = await supabase.rpc('admin_get_reminder_settings');
// { reminders_enabled, days_between, max_reminders, inactive_days, detection_enabled, updated_at }

const { data: saved } = await supabase.rpc('admin_set_reminder_settings', {
  p_reminders_enabled: true,
  p_days_between: 7, // pass only what changed, others can be omitted
  p_max_reminders: 3, // min 1, max 10
});
```
Small form: on/off switch, "days between reminders", "max reminders per player". Show `inactive_days` and `detection_enabled` as read-only (those stay backend-controlled). Invalid values come back as an error, so show it in a toast.

### 3g. CAPTCHA stats card (placeholder)
CAPTCHA pass/fail numbers come from Cloudflare, not our database. Hamza is sending the Cloudflare API details soon and will add a function for it. For now, build an empty card titled "CAPTCHA challenges" (solved / failed / total, last 7 days) with "Coming soon". Don't wait on this. Start everything else now.

## 4. Small cleanups
* `.example.env`: replace `VITE_RECAPTCHA_SITE_KEY` with `VITE_TURNSTILE_SITEKEY`.
* Remove any leftover Google reCAPTCHA code or packages.
* If there's any "resend verification email" button (`supabase.auth.resend`), it needs a `captchaToken` too.
* Don't deploy edge functions from an old local copy. Pull first (`send-contact-email` changed).
* Don't change database tables or functions directly. Ask Hamza if you need a new field or function.

## Before you tell me it's done

| Check | Expected |
|---|---|
| Change password (normal Chrome, not headless) | Correct current password: saved. Wrong one: "incorrect" |
| Login flagged test account | Redirected to `/verify-account`, code email arrives |
| Wrong code / expired code | Clear error, can resend after 60s |
| Correct code | Lands on dashboard, never sees the screen again |
| Security tab as admin | Cards, chart, log, players table and settings all load |
| Security tab as a normal player | Not visible / not accessible |
| Send reminder to 1 test player | Toast shows queued: 1, email arrives within ~10 min |

Only commit changes after testing the implementation and ensuring that it works as expected, do this for each task, then send me a Pull Request to review. 