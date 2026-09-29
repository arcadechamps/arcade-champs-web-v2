# Arcade Champs: Turnstile & Honeypot Frontend Setup
**Signup protection, Phase 1 | From Hamza (backend) to Danjuma (frontend)**

---

## 1. Summary

The backend side of signup protection is built, installed in Supabase, and tested. It blocks disposable emails, limits signups per IP, and checks a honeypot field and how fast the form was filled. What's left is the frontend part:

- Add the Cloudflare Turnstile widget to the signup, login, and forgot password forms and send its token to Supabase.
- Add a hidden honeypot field and a form fill timer to the signup form and send both in the signup metadata.
- Show friendly messages for the new error codes.

No new API endpoints are needed. Everything goes through the Supabase auth calls you already use.

---

## 2. Keys and settings

| Item | Value |
| :--- | :--- |
| **Turnstile sitekey** (public, safe to put in frontend code) | `0x4AAAAAAFDOAiyFrl--IlJr` |
| **Allowed hostnames** | `arcadechamps.com`, `www.arcadechamps.com`, `localhost` |
| **Widget mode** | Managed (most users see an automatic check, risky visitors get a checkbox) |
| **Secret key** | Already handled on my side in Supabase. You don't need it. |

> **Note:** If you test on a staging or preview URL that isn't in the list above, send me the hostname and I'll add it, otherwise the widget will fail there. `localhost` already works.

---

## 3. Turnstile setup

### Step 1: Install the React component

```bash
npm install @marsidev/react-turnstile
```

If the site isn't React, use Cloudflare's plain script (`https://challenges.cloudflare.com/turnstile/v0/api.js`) and `turnstile.render()`. The rules below stay the same.

### Step 2: Add the widget to the form

```jsx
import { useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

const TURNSTILE_SITEKEY = "0x4AAAAAAFDOAiyFrl--IlJr";

const [captchaToken, setCaptchaToken] = useState(null);
const turnstileRef = useRef(null);

<Turnstile
  ref={turnstileRef}
  siteKey={TURNSTILE_SITEKEY}
  onSuccess={(token) => setCaptchaToken(token)}
  onExpire={() => setCaptchaToken(null)}
  onError={() => setCaptchaToken(null)}
/>
```

### Step 3: Pass the token to Supabase

All three forms need it. Supabase checks the token on signup, login, and password reset, so if any of these calls is missing the token it will fail once CAPTCHA is switched on.

#### Signup
*(Honeypot fields are added in section 4)*

```javascript
await supabase.auth.signUp({
  email,
  password,
  options: { captchaToken }
});
```

#### Login

```javascript
await supabase.auth.signInWithPassword({
  email,
  password,
  options: { captchaToken }
});
```

#### Forgot password

```javascript
await supabase.auth.resetPasswordForEmail(email, { captchaToken });
```

> **Note:** If the site uses any other Supabase auth call (magic link/`signInWithOtp`, resend for the verification email, anonymous sign in), it also needs `captchaToken` in its options. Let me know if there are any.

### Step 4: Reset the widget after every submit

Tokens are single use. After each submit attempt, successful or not, reset the widget and clear the token, otherwise the second try fails.

```javascript
turnstileRef.current?.reset();
setCaptchaToken(null);
```

### Step 5: Button state

- Keep the submit button disabled until `captchaToken` is set.
- Most users get the token automatically within a second or two, so this is barely noticeable.

---

## 4. Honeypot and timing (signup form only)

The backend checks two extra values that the signup form sends in its metadata. Login and forgot password don't need these.

### Honeypot field

A normal looking text input that real users never see. Bots fill every field, so if it has a value, the signup is blocked.

- Give it an ordinary name like `website`. Don't call it "honeypot".
- Hide it by moving it off-screen with CSS. Don't use `display: none` or `type="hidden"`, a lot of bots skip those.
- Add `tabIndex={-1}`, `autoComplete="off"`, and `aria-hidden="true"` so keyboard users, screen readers, and password managers leave it alone.

```jsx
const [hp, setHp] = useState("");

<div
  style={{
    position: "absolute",
    left: "-10000px",
    top: "auto",
    width: 1,
    height: 1,
    overflow: "hidden"
  }}
  aria-hidden="true"
>
  <label htmlFor="website">Website</label>
  <input
    id="website"
    name="website"
    type="text"
    tabIndex={-1}
    autoComplete="off"
    value={hp}
    onChange={(e) => setHp(e.target.value)}
  />
</div>
```

### Form fill timer

Record when the signup form first appears, then at submit send how many milliseconds passed. Anything under 3 seconds is treated as a bot.

Send the duration (`form_fill_ms`), not a timestamp. Both times come from the browser, so users with a wrong computer clock aren't blocked by mistake. This replaces the `form_started_at` field from my earlier message.

```javascript
const formStartedAt = useRef(Date.now()); // set once on mount, never reset on re-render
```

### Final signup call

```javascript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    captchaToken,
    data: {
      hp: hp, // must be "" for real users
      form_fill_ms: Math.round(Date.now() - formStartedAt.current)
    }
  }
});

turnstileRef.current?.reset();
setCaptchaToken(null);
```

> **Note:** Keep the key names exactly `hp` and `form_fill_ms`, the backend reads those. Always send `hp` even when it's empty.

---

## 5. Error messages

Blocked signups come back as a normal Supabase auth error. Check `error.message`:

| `error.message` | Show the user |
| :--- | :--- |
| `disposable_email` | *"Please use a permanent email address."* |
| `rate limited` | *"Too many signup attempts. Please try again later."* |
| `signup_blocked` | *"Something went wrong, please try again."* (honeypot or timing. Keep it vague on purpose so bots learn nothing.) |
| Any message mentioning `captcha` | *"Verification failed, please try again."* and reset the widget. |

Any other error: show whatever the site already shows today.

---

## 6. Rollout order (important)

CAPTCHA is not switched on in Supabase yet. The moment it's on, any login, signup, or password reset without a token fails for everyone. So please deploy first, then we switch it on together.

1. **Build and test** everything locally (`localhost` is already allowed).
2. **Deploy to the live site.** Nothing breaks, since the backend accepts requests with or without the new fields for now.
3. **Ping me.** On a quick call I switch on CAPTCHA in Supabase and turn on strict honeypot/timing checks.
4. **Run the test checklist** below straight away. If anything fails, I can switch both off in seconds.

---

## 7. Test checklist

| Test | Expected |
| :--- | :--- |
| Normal signup, fill the form like a real user | Account created, verification email sent |
| Normal login | Logs in |
| Forgot password | Reset email sent |
| Two submits in a row on the same form (e.g. wrong password, then right) | Second attempt works (widget reset properly) |
| Signup with a `@mailinator.com` address | `disposable_email` message |
| Type into the hidden field using dev tools, then submit | `signup_blocked` message |
| Timer and hidden field: after your normal test signup, I check the signup log on my side | Log shows the fill time (e.g. 12000 ms) and the hidden field arrived empty |
| Tab through the signup form with the keyboard | Hidden field is never focused |
| Password manager autofill on signup | Hidden field stays empty |
| Mobile browser | Widget shows and passes, layout looks fine |

---

Questions or anything unclear, just message me.