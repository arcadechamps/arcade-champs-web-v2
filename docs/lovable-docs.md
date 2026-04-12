# ArcadeChamps Platform — Technical Documentation

> Last updated: 2026-03-26
> Purpose: Onboarding document for AI agents and developers working on this codebase.

---

## 1. Project Overview

**ArcadeChamps** is a competitive retro gaming platform where players join paid contests, play classic arcade and console games via EmulatorJS, and compete for cash prizes.

### Business Model

- Players deposit funds into an in-app wallet via Stripe Checkout
- Contest entry fees are deducted from the wallet on session start
- Admins declare winners and issue payouts (PayPal, Venmo, CashApp)
- Free play mode available for casual gaming without wallet requirements

### Target Audience

Retro gaming enthusiasts who want competitive, skill-based contests with real money stakes — plus casual players who just want to play classic games.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, CSS custom properties (HSL tokens) |
| Routing | react-router-dom v6 |
| State/Data | TanStack Query v5 (2-min stale time, no refetch on focus/remount) |
| Auth | Supabase Auth (email/password) |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (5 buckets) |
| Edge Functions | Supabase Edge Functions (Deno) |
| Game Engine | EmulatorJS (retro game emulation in iframe) |
| Anti-Cheat | Custom WASM engine (`arcade_core.wasm` + `arcade_core.js`) |
| Score Extraction | n8n webhook (external) |
| Payments | Stripe Checkout (test + live keys) |
| Animations | CSS + Tailwind animate |
| SEO | react-helmet-async, JSON-LD, sitemap.xml |
| Form Validation | Zod + react-hook-form |

---

## 3. Project Structure

```
src/
├── assets/            # Static images (hero, game thumbnails, community)
├── components/
│   ├── ui/            # shadcn/ui primitives (button, dialog, table, tabs, etc.)
│   ├── dashboard/     # Dashboard-specific components
│   │   ├── AdminContestManager.tsx   # Contest CRUD, participant management, ban/unban, winner declaration
│   │   ├── AdminGameManager.tsx      # Game CRUD, ROM/thumbnail upload
│   │   ├── AdminOverview.tsx         # Admin stats & activity feed
│   │   ├── AdminPlayerList.tsx       # Player listing, payout processing for admins
│   │   ├── AdminSessions.tsx         # Session monitoring with pagination
│   │   ├── AdminAntiCheat.tsx        # Anti-cheat log viewer with status update
│   │   ├── AdminNewsletterSubscribers.tsx  # Newsletter management with search, CSV export, bulk delete
│   │   ├── ChangePasswordCard.tsx    # Secure password change with re-auth & Zod validation
│   │   ├── DashboardContestGames.tsx # Player's joined contest games (inline join & expand)
│   │   ├── DashboardFreeGames.tsx    # Free play game listing
│   │   ├── DashboardSidebar.tsx      # Dashboard navigation sidebar (collapsible, role-based)
│   │   ├── GameFormDialog.tsx        # Game create/edit form with datetime helpers
│   │   ├── GameplayMediaViewer.tsx   # Screenshot/recording viewer for admins
│   │   ├── InputReplayViewer.tsx     # Anti-cheat input keylog timeline viewer
│   │   ├── Leaderboard.tsx           # Per-contest & overall leaderboard with pagination
│   │   ├── PlayerContests.tsx        # Find & join contests (inline, no redirect)
│   │   ├── PlayerOverview.tsx        # Player stats, streaks, recent sessions
│   │   ├── ProfileSettings.tsx       # Profile, payout method, avatar upload, password change
│   │   ├── SessionHistory.tsx        # Player session history with pagination
│   │   ├── TablePagination.tsx       # Shared pagination component + usePagination hook
│   │   └── WalletPanel.tsx           # Wallet balance, add funds, withdraw, transaction history
│   ├── Header.tsx / Footer.tsx / Layout.tsx / BottomNav.tsx
│   ├── GameCard.tsx                  # Reusable game card component
│   ├── GamePlayer.tsx                # EmulatorJS iframe wrapper
│   ├── KeymapOverlay.tsx             # Gamepad + keyboard controls overlay (collapsible, per-game)
│   ├── ContestRulesModal.tsx         # Contest rules gate with fee confirmation & "don't remind" option
│   ├── ContestNotStartedDialog.tsx   # Dialog shown when contest hasn't started yet
│   ├── ContestTour.tsx               # Contest-specific onboarding tour
│   ├── OnboardingTour.tsx            # Reusable tour system with highlight cutout & scroll tracking
│   ├── CookieConsent.tsx             # GDPR cookie consent banner
│   ├── PageMeta.tsx                  # SEO meta tags, Open Graph, JSON-LD schema
│   ├── ScrollToTop.tsx               # Auto-scroll to top on route change
│   └── NavLink.tsx
├── data/
│   ├── games.ts                      # Static game metadata
│   ├── games-config.ts              # EmulatorJS core/ROM configuration
│   └── keymappings.ts               # Keyboard/gamepad key mappings per game + DB merge utility
├── hooks/
│   ├── useAuth.tsx                   # Auth context provider & hook with refreshProfile()
│   ├── useAntiCheat.ts              # WASM-based behavioral anti-cheat hook
│   ├── useDashboardData.ts          # Centralized dashboard data fetching
│   ├── useScoreExtraction.ts        # n8n webhook score extraction mutation
│   ├── useScrollReveal.ts           # Scroll-based reveal animations
│   ├── use-mobile.tsx               # Mobile breakpoint detection
│   └── use-toast.ts                 # Toast notification hook
├── integrations/supabase/
│   ├── client.ts                    # Supabase client singleton
│   └── types.ts                     # Auto-generated DB types (read-only)
├── lib/
│   ├── utils.ts                     # Utility functions (cn, etc.)
│   ├── datetime.ts                  # UTC ↔ local datetime-local conversion helpers
│   └── network-error-handler.ts     # Centralized error classification, retry toasts, offline detection
├── pages/
│   ├── Index.tsx                    # Landing page (hero, features, newsletter, CTA)
│   ├── Games.tsx                    # Public game library with filters
│   ├── Contest.tsx                  # Public contest listing
│   ├── ContestPlay.tsx             # Contest gameplay page (timer, screenshot, score)
│   ├── FreePlay.tsx                # Free play game page
│   ├── Dashboard.tsx               # Role-based dashboard (admin vs player)
│   ├── Leaderboard.tsx             # Public global leaderboard (paginated, filterable)
│   ├── Login.tsx / Signup.tsx      # Auth pages
│   ├── ForgotPassword.tsx          # Password reset email request
│   ├── ResetPassword.tsx           # Password reset form (from email link)
│   ├── About.tsx                   # About page
│   ├── PaymentSuccess.tsx          # Post-Stripe-checkout wallet verification
│   ├── PaymentCancel.tsx           # Stripe checkout cancellation page
│   ├── TermsOfService.tsx          # Terms of service
│   ├── PrivacyPolicy.tsx           # Privacy policy
│   └── NotFound.tsx                # 404 page
├── types/database.ts               # Manual TypeScript interfaces for DB entities
├── utils/contestStatus.ts          # Contest status helper utilities
└── scripts/generate-sitemap.ts     # Sitemap generator

supabase/
├── config.toml                     # Edge function config
├── functions/
│   ├── create-wallet-topup/        # Creates Stripe Checkout session for wallet deposit
│   ├── verify-wallet-topup/        # Verifies Stripe payment & credits wallet
│   ├── update-contest-statuses/    # Auto-transitions contest lifecycles
│   ├── upload-screenshot/          # Screenshot upload for contest sessions
│   └── upload-recording/           # Recording upload edge function
└── migrations/                     # SQL migrations (read-only)

public/
├── game-frame.html                 # EmulatorJS iframe runner
├── arcade_core.js                  # Anti-cheat WASM JS loader
├── arcade_core.wasm                # Anti-cheat WASM binary
├── SpaceCadet/                     # 3D Pinball Space Cadet (JS/WASM port)
├── emulator/                       # ROM files for EmulatorJS
├── favicon.ico / logo.png / og-image.png
├── sitemap.xml / robots.txt / manifest.json
└── placeholder.svg
```

---

## 4. Authentication

### Provider

Supabase Auth (email/password sign-up & sign-in).

### Implementation

`useAuth` hook + `AuthProvider` context in `src/hooks/useAuth.tsx`. Exposes `user`, `profile`, `loading`, `refreshProfile()`.

### Role System

`is_admin` boolean flag on `profiles` table. Admin email `admin@arcadechamps.com` is auto-flagged via `handle_new_auth_user()` trigger.

### Protected Routes

Dashboard and contest play pages require authentication via `<ProtectedRoute>` wrapper.

### Profile Auto-Creation

Database trigger `handle_new_auth_user()` creates profile + wallet on signup.

### Forgot Password Flow

1. User visits `/forgot-password` and enters their email
2. Supabase sends a recovery email with a redirect link to `/reset-password`
3. `/reset-password` handles the recovery session and allows committing a new password via `supabase.auth.updateUser()`

### In-Dashboard Password Change

- Component: `ChangePasswordCard.tsx` in Profile Settings
- **Re-authentication**: Verifies current password via `supabase.auth.signInWithPassword()` before allowing update
- **Zod validation**: 8+ characters, at least one uppercase, one lowercase, one number, max 72 characters
- **UX**: Password visibility toggles (Eye/EyeOff) on all three fields, inline success feedback, loading states

### Avatar Upload

Users upload avatars to the `avatars` Supabase Storage bucket. Path pattern: `{userId}/avatar.{ext}`. Max 2 MB, image files only. Public URL stored on `profiles.avatar_url` with cache-bust parameter.

---

## 5. Database Schema (Supabase PostgreSQL)

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles & roles | `user_id` (PK), `display_name`, `username`, `is_admin`, `avatar_url`, `payout_method`, `payout_handle` |
| `games` | Game library | `id`, `slug`, `title`, `core`, `rom_path`, `thumbnail_path`, `is_active`, `keymapping` (JSONB) |
| `contests` | Contest definitions | `id`, `slug`, `title`, `status` (upcoming/active/closed), `session_fee_cents`, `session_duration_seconds`, `starts_at`, `ends_at` |
| `contest_games` | Many-to-many: contests ↔ games | `contest_id`, `game_id`, `is_active`, `sort_order` |
| `contest_participants` | Contest enrollment & moderation | `contest_id`, `user_id`, `is_banned`, `ban_reason` |
| `contest_winners` | Declared winners per contest | `contest_id`, `user_id`, `winning_score`, `payout_cents`, `declared_by` |
| `game_sessions` | Individual play sessions | `session_id`, `user_id`, `contest_id`, `game_id`, `status`, `score`, `screenshot_path`, `recording_path`, `screenshot_count`, `start_timestamp_ms`, `end_timestamp_ms`, `allowed_duration_seconds` |
| `contests` | Contest definitions | `id`, `slug`, `title`, `status`, `session_fee_cents`, `session_duration_seconds`, `starts_at`, `ends_at`, `prize_cents`, `prize_image_path` |
| `wallets` | User balance | `user_id` (PK), `balance_cents` |
| `wallet_transactions` | Financial ledger | `user_id`, `type` (topup/session_fee/payout/admin_adjust), `status`, `amount_cents`, `meta` (contains `stripe_session_id` for idempotency) |
| `anti_cheat_logs` | Cheat detection records | `session_id`, `user_id`, `contest_id`, `game_id`, `status` (clean/suspected/confirmed), `reason`, `evidence` |
| `newsletter_subscribers` | Newsletter email list | `id`, `email`, `subscribed_at` |
| `user_roles` | Role-based access (enum: admin/moderator/user) | `id`, `user_id`, `role` |

### Database Functions

| Function | Purpose |
|----------|---------|
| `is_admin()` | SECURITY DEFINER — checks if current user is admin (used in RLS) |
| `has_role(_user_id, _role)` | SECURITY DEFINER — checks if user has a specific app_role |
| `apply_wallet_transaction()` | Trigger — auto-updates wallet balance on transaction insert/status change |
| `handle_new_auth_user()` | Trigger — creates profile & wallet for new auth users |
| `get_contest_leaderboard(_contest_id, _limit)` | SECURITY DEFINER — returns ranked scores for a single contest (bypasses RLS for public access) |
| `get_global_leaderboard(_limit, _offset, _contest_id?, _game_id?, _search?)` | SECURITY DEFINER — returns paginated cross-contest rankings with optional filters |
| `get_global_leaderboard_count(_contest_id?, _game_id?, _search?)` | SECURITY DEFINER — returns total count for global leaderboard (with optional filters) |
| `get_display_names(user_ids)` | SECURITY DEFINER — batch-fetches display names and avatars for a list of user IDs |

### Triggers

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `on_wallet_transaction` | `wallet_transactions` | AFTER INSERT OR UPDATE | `apply_wallet_transaction()` |

> **IMPORTANT**: There must be exactly ONE trigger calling `apply_wallet_transaction()`. A duplicate trigger (`trg_apply_wallet_transaction`) was removed in migration `20260304150804` to fix a double-crediting bug.

### RLS Policy Pattern

All tables have RLS enabled. General pattern:
- **SELECT**: Own data OR admin (`auth.uid() = user_id OR is_admin()`)
- **INSERT**: Own data OR admin
- **UPDATE**: Admin only (for moderation tables) or own data
- **DELETE**: Restricted on most tables
- **Public tables** (games, contests, contest_games, contest_winners, newsletter_subscribers): Public SELECT, admin-only write

---

## 6. Storage Buckets

| Bucket | Public | Purpose | Access |
|--------|--------|---------|--------|
| `game-roms` | Yes | ROM files for EmulatorJS | Public read, admin write |
| `game-thumbnails` | Yes | Game thumbnail images | Public read, admin write |
| `gameplay-screenshots` | No | Contest session evidence | Admin read all, users upload own only |
| `gameplay-recordings` | No | Contest session recordings | Admin read all, users upload own only |
| `avatars` | Yes | User profile avatars | Public read, users upload own only |

---

## 7. Edge Functions

### `create-wallet-topup`

- Creates a Stripe Checkout session for wallet deposits
- Validates amount ($1–$1000), authenticates user via JWT
- Supports both `STRIPE_TEST_SECRET_KEY` and `STRIPE_SECRET_KEY` (test key takes priority)
- Returns checkout URL for redirect

### `verify-wallet-topup`

- Verifies Stripe payment after checkout redirect
- **Idempotency**: Checks `meta->>stripe_session_id` before inserting to prevent duplicate credits
- Uses Service Role to insert `wallet_transactions` (bypasses RLS)
- The single `on_wallet_transaction` trigger auto-updates wallet balance

### `upload-screenshot`

- Receives multipart form (screenshot file + session_id)
- Validates JWT manually (`verify_jwt = false`)
- Uploads to `gameplay-screenshots/{userId}/{sessionId}.png` using Service Role Key
- Updates `game_sessions.screenshot_path`

### `upload-recording`

- Handles gameplay recording uploads to `gameplay-recordings` bucket

### `send-contact-email`

- Receives contact form submissions containing `name`, `email`, `subject`, and `message`
- Uses the Resend API to securely send HTML-formatted emails to the admin (`admin@arcadechamps.com`) with a `reply_to` set to the submitting user
- Performs basic validation and handles edge function CORS preflight requests securely
- Requires `RESEND_API_KEY` as an edge function secret

### `update-contest-statuses`

- Auto-transitions contests: `upcoming → active` (when `starts_at` passes), `active → closed` (when `ends_at` passes)
- Uses Service Role Key

---

## 8. Key Features

### 8.1 Game Library & EmulatorJS Integration

- Games configured in `src/data/games-config.ts` with core type, ROM paths
- `GamePlayer` component renders EmulatorJS inside `public/game-frame.html` iframe
- MAME compatibility: ROM fetched as binary, `EJS_gameName` set explicitly
- Admin can import/upload games via `AdminGameManager`
- Includes 3D Pinball Space Cadet as a standalone JS/WASM game
- **Supported cores**: `mame2003_plus`, `fceumm` (NES), `snes9x` (SNES), `gambatte` (Game Boy), `segaMD` (Sega Mega Drive — maps to `genesis_plus_gx`), `custom`
- **Admin-configurable keymappings**: Per-game control mappings stored as JSONB in `games.keymapping` column (see §8.19)

### 8.2 Contest System

- **Lifecycle**: upcoming → active → closed (admin-managed + auto-transition via edge function)
- **Session fees**: Deducted from wallet on session start
- **Duration**: Admin-defined in minutes, stored as seconds, enforced by countdown timer
- **Games**: Many-to-many via `contest_games` table
- **Participation**: Users join contests, admins can ban/unban with reasons
- **Prize image**: Admins can upload a prize image (e.g., a PS5 photo) when creating/editing a contest. Stored in `game-thumbnails` bucket at `prizes/{contestId}.{ext}`, path saved in `contests.prize_image_path`. Displayed on the public contest card between the title and description.
- **Contest Rules Modal**: Gate before gameplay with rules summary (timed session, score tracking, anti-cheat active). For **paid contests**, always shows entry fee confirmation. For **free contests**, offers a "Don't remind me again" checkbox (localStorage-persisted). Shows inline error on insufficient balance.
- **Contest Not Started Dialog**: Shown when a user tries to play a contest that hasn't started yet
- **Public contest leaderboard**: Each contest card has a collapsible leaderboard showing top 5 players (see §8.10)

### 8.3 Contest Gameplay (`ContestPlay.tsx`)

- Rules modal gate with "Don't remind me again" (localStorage)
- Real-time countdown timer based on `allowed_duration_seconds`
- **Scroll lock**: During gameplay, page scrolling is disabled to prevent accidental navigation
- On timer expiry:
  1. Captures canvas screenshot
  2. Uploads via `upload-screenshot` edge function
  3. Sends screenshot to n8n webhook for score extraction
  4. Submits score to WASM anti-cheat for behavioral verdict
  5. Updates `game_sessions` with extracted score
  6. Inserts `anti_cheat_logs` with WASM verdict

### 8.4 Dashboard — Role-Based

#### Player Sections
| Section | Component | Description |
|---------|-----------|-------------|
| Home Dashboard | `PlayerOverview` | Stats, streaks, recent sessions |
| Free Games | `DashboardFreeGames` | Browse & launch free play games |
| Contest Games | `DashboardContestGames` | Joined contests with expandable game lists |
| Find Contests | `PlayerContests` | Discover & join contests inline |
| My Wallet | `WalletPanel` | Balance, add funds via Stripe, request withdrawals, paginated transaction history |
| Play History | `SessionHistory` | Paginated session log |
| Leaderboards | `Leaderboard` | Per-contest & overall rankings with pagination |
| My Profile | `ProfileSettings` | Display name, username, avatar, payout method, password change |

#### Admin Sections
| Section | Component | Description |
|---------|-----------|-------------|
| Overview | `AdminOverview` | Platform stats & activity feed |
| Contest Manager | `AdminContestManager` | Contest CRUD, participants, ban/unban, winner declaration, gameplay media viewer |
| Game Library | `AdminGameManager` | Game CRUD, ROM/thumbnail upload |
| Player Directory | `AdminPlayerList` | Player listing with pagination, payout processing |
| Anti-Cheat Control | `AdminAntiCheat` | Anti-cheat log viewer with status updates |
| Game Sessions | `AdminSessions` | Session monitoring with pagination |
| Newsletter | `AdminNewsletterSubscribers` | Search, CSV export, bulk delete |

### 8.5 Wallet & Payment System

#### Flow: Wallet Top-Up via Stripe

1. User selects amount (preset $5/$10/$25/$50 or custom) → frontend calls `create-wallet-topup` edge function
2. Edge function creates Stripe Checkout session → returns URL
3. User completes payment on Stripe → redirected to `/payment-success?session_id=...`
4. `PaymentSuccess.tsx` calls `verify-wallet-topup` edge function
5. Edge function verifies payment with Stripe, checks idempotency, inserts `wallet_transactions` record
6. Database trigger `on_wallet_transaction` auto-updates `wallets.balance_cents`
7. Frontend invalidates `wallet-balance` and `dashboard` query caches
8. Cancelled payments redirect to `/payment-cancel` with a return-to-wallet CTA

#### Transaction Types

| Type | Effect on Balance | Description |
|------|------------------|-------------|
| `topup` | + amount_cents | Stripe deposit |
| `payout` | + amount_cents (succeeded) / −amount_cents (pending) | Withdrawal requests & admin-processed payouts |
| `admin_adjust` | ± amount_cents | Manual admin adjustments |
| `session_fee` | − amount_cents | Contest entry fee deduction |

#### Critical: Single Trigger Rule

The `wallet_transactions` table must have **exactly one** trigger calling `apply_wallet_transaction()`. A historical bug had two duplicate triggers, causing every transaction to credit the wallet **twice**. Fixed in migration `20260304150804`.

### 8.6 Payout & Withdrawal System

1. **Player configures payout method** in Profile Settings: PayPal (email), Venmo (username), or CashApp ($cashtag)
2. **Player requests withdrawal** from Wallet panel: enters amount (min $1, max current balance), preset buttons ($5/$10/$25/All)
3. System inserts a `wallet_transactions` record with `type: "payout"`, `status: "pending"`, `amount_cents: -cents`
4. **Admin reviews** in Player Directory and processes the payout externally
5. Admin marks transaction as `succeeded` → trigger updates wallet balance

### 8.7 Profile Management

- **Display Name**: Required, max 50 chars, shown on leaderboards
- **Username**: Optional, unique (validated against DB), 3–30 chars, letters/numbers/underscores only. Shown on leaderboards, header dropdown, dashboard greeting
- **Avatar**: Upload to `avatars` bucket, max 2 MB, cache-bust URL
- **Payout Method**: PayPal / Venmo / CashApp with conditional handle input
- **Form Validation**: All fields use Zod schemas with react-hook-form

### 8.8 Pagination

A shared `TablePagination` component and `usePagination` hook in `src/components/dashboard/TablePagination.tsx` provide consistent pagination across all high-volume tables:

- **Client-side** (via `usePagination` hook): Wallet transactions, Play History, Leaderboard, Admin Player Directory, Admin Sessions — slices pre-fetched arrays into pages of 10
- **Server-side** (via Supabase `.range()`): Newsletter subscribers — fetches 20 per page with count

The component renders page numbers with ellipsis, prev/next buttons, and a "X–Y of Z" summary.

### 8.9 Onboarding Tours

A reusable `OnboardingTour` component provides guided tours for new users:

- **Architecture**: Decentralized — each dashboard section defines its own `TourStep[]` array and `storageKey`
- **Storage**: Each tour uses a unique `localStorage` key (e.g., `tour-player-wallet`, `tour-player-profile`, `onboarding-contest-complete`) so tours are independent
- **UX**: SVG backdrop with cutout highlight around target element, tooltip with step counter, Next/Back/Skip controls
- **Scroll tracking**: `scrollIntoView` + resize/scroll listeners to keep highlight aligned
- **Conditional triggering**: Only shows if the `storageKey` is not already set to `"true"` in localStorage. Delays 800ms before appearing.

#### Active Tours

| Section | Storage Key | Steps |
|---------|-------------|-------|
| Player Wallet | `tour-player-wallet` | Add Funds, Withdraw Winnings, Transaction History |
| Player Profile | `tour-player-profile` | Public Profile, Payout Method, Secure Your Account |
| Find Contests | `onboarding-contest-complete` | Browse Contests, Contest Details, Enter a Contest, View Games |

### 8.10 Leaderboard System

The platform has three complementary leaderboard surfaces:

#### Dashboard Leaderboard (`src/components/dashboard/Leaderboard.tsx`)
- Per-contest and overall rankings for authenticated users
- Crown/medal icons for top 3, highlights current user
- Paginated via `TablePagination`

#### Public Global Leaderboard (`/leaderboard` — `src/pages/Leaderboard.tsx`)
- Accessible without login at `/leaderboard`
- Displays top-to-bottom scores from all active and closed contests
- **Server-side pagination**: 10 entries per page via `get_global_leaderboard` RPC
- **Filters**: Debounced player name search, contest dropdown, game dropdown
- **Count RPC**: `get_global_leaderboard_count` provides filtered totals
- Each entry shows: rank (crown/medal/award for top 3), avatar, display name, game title, contest title, and score
- "You" badge highlights the current user's entries (if logged in)
- Smart pagination with ellipsis for large result sets
- Empty states distinguish between "no data" and "no filter matches"

#### Contest Card Leaderboard (`src/pages/Contest.tsx`)
- Collapsible, lazy-loaded leaderboard on each contest card on the public `/contest` page
- Uses `get_contest_leaderboard` RPC (fetched on expand, not on page load)
- Shows top 5 players with rank icons, avatars, display names, and scores
- Accessible to unauthenticated visitors (anon key can call the SECURITY DEFINER RPC)
- "View Full Leaderboard" link navigates to `/leaderboard` with contest filter

#### Security Model
All leaderboard RPCs are `SECURITY DEFINER`, bypassing RLS to allow anonymous access while only exposing public data (display name, username, avatar, score). No PII (email, payout info) is returned.

### 8.11 Anti-Cheat System

#### Architecture

The anti-cheat uses a **WASM-based behavioral analysis engine** (`arcade_core.wasm`) loaded via `arcade_core.js` (Emscripten).

#### Input Keylogging & Replay

During contest gameplay, the platform records a detailed log of player keyboard and gamepad inputs, capturing event types (keydown/keyup/gamepad), key codes, and relative timestamps. This log (capped at 5,000 entries) is stored in the `evidence` JSONB column of `anti_cheat_logs`. Administrators can review these inputs via the **Input Replay Viewer** (`InputReplayViewer.tsx`), integrated into both the Anti-Cheat control panel and the Contest Manager's participant session list. The viewer renders events as a scrollable timeline with icon-based representations (arrow keys, KBD tags, colored gamepad buttons) to help verify the legitimacy of high scores.

#### Hook: `useAntiCheat.ts`

Exposes: `isReady`, `setGameConfig(gameSlug)`, `startSession(sessionId)`, `recordInput()`, `submitScore(sessionId, score)`

#### WASM API (via Emscripten `ccall`)

| Function | Args (JSON string) | Returns |
|----------|-------------------|---------|
| `ac_init` | Default config thresholds | number |
| `ac_set_game_config` | Per-game overrides | number |
| `ac_start_session` | `{ sessionId }` | number |
| `ac_notify_event` | `{ type, ... }` (focus_lost, focus_gained, input_sample) | number |
| `ac_submit_score` | `{ sessionId, reportedScore, elapsedMs }` | JSON string verdict |

#### Verdict Mapping

| WASM Verdict | DB `status` | Meaning |
|-------------|-------------|---------|
| `accepted: true` | `clean` | Session verified |
| `suspicious: true` | `suspected` | Anomalous behavior detected |
| `accepted: false, suspicious: false` | `confirmed` | Cheat confirmed |

#### System Failure Handling

When the WASM engine is unavailable or returns invalid data, the system explicitly flags sessions as `suspected` with specific reason codes:
- `WASM_NOT_READY` — Engine not loaded when score submitted
- `EMPTY_WASM_RESPONSE` — Engine returned invalid/empty response
- `WASM_ERROR` — Runtime error during score submission

> **Design principle**: Unverified sessions are never silently marked as `clean`. All verification gaps are visible to admins.

#### Per-Game Config Overrides

```typescript
{
  "space-cadet": { maxAPS: 20 },
  "tetris":      { minInputsForScore: 30 },
  "inthunt":     { maxAPS: 25, minInputsForScore: 20 },
  "opwolf":      { maxAPS: 25, minInputsForScore: 15 },
  "outrun":      { maxAPS: 15, minInputsForScore: 20, maxFocusLosses: 3 },
  "rtype":       { maxAPS: 25, minInputsForScore: 20 },
  "mspacman":    { maxFocusLosses: 3, maxBlurMs: 10000 },
  "metal-slug":  { maxAPS: 28, minInputsForScore: 25 },
  "contra":      { maxAPS: 28, minInputsForScore: 25 },
  "dkong":       { maxAPS: 15, minInputsForScore: 15 },
  "sonic":       { maxAPS: 20, minInputsForScore: 20 },
}
```

### 8.12 Network Error Handling

Centralized in `src/lib/network-error-handler.ts`:

- **`handleNetworkError(error, context?, options?)`**: Classifies errors (offline, 401, 403, 429, 5xx, fetch failure) and shows appropriate toasts
- **`handleSupabaseError(error, context?, options?)`**: Wrapper that returns `true` if error exists (for inline guard pattern)
- **Retry support**: Optional `onRetry` callback adds a "Retry" button to toast
- **Offline detection**: Throttled offline toasts (5s cooldown), persistent banner with auto-dismiss on reconnect
- **Global listeners**: `setupNetworkListeners()` registered in `App.tsx` for online/offline events
- **Query error handler**: Global TanStack Query error handler catches silent fetch failures

### 8.13 Cookie Consent

GDPR-style banner (`CookieConsent.tsx`) with Accept/Decline buttons. Persisted to `localStorage` key `cookie_consent`. Links to Privacy Policy. Delays 800ms before appearing. Included in `Layout.tsx`.

### 8.14 Newsletter Subscription

- **Landing page**: Email signup form on `Index.tsx` inserts into `newsletter_subscribers` table
- **Admin management** (`AdminNewsletterSubscribers.tsx`):
  - Server-side paginated list (20 per page) with search by email
  - CSV export of current page
  - Individual and bulk delete with confirmation dialogs
  - Select-all-on-page checkbox

### 8.15 SEO & Meta

- **`PageMeta` component**: Wraps `react-helmet-async` to set title, description, Open Graph, Twitter Card, canonical URL, and JSON-LD schema per page
- **Convention**: Title format is `"{Page} | Arcade Champs"` (except Home)
- **Static files**: `sitemap.xml`, `robots.txt`, `manifest.json`, `og-image.png`
- **Sitemap generator**: `src/scripts/generate-sitemap.ts`

### 8.16 Scroll & Navigation

- **`ScrollToTop`**: Smooth scroll to top on every route change (registered in `App.tsx` inside `<BrowserRouter>`)
- **Scroll lock during gameplay**: Prevents page scrolling while the emulator iframe is active in `ContestPlay.tsx`
- **`BottomNav`**: Mobile-only bottom navigation bar (visible below `lg` breakpoint), main content has `pb-16 lg:pb-0` padding

### 8.17 Username Display

Unique usernames are shown across the platform:
- Leaderboard rankings (fallback to display name)
- Header dropdown greeting
- Dashboard player overview
- Uniqueness validated against the database on save

### 8.18 Keymapping & Controls Help System

A visual controls overlay (`KeymapOverlay.tsx`) is displayed alongside the game player in both Free Play and Contest Mode, helping users understand which keys/buttons to use for each game.

#### Architecture

- **Config file** (`src/data/keymappings.ts`): Defines the `KeyMapping` interface with physical keys and descriptive action labels (e.g., `a: "Z"`, `aAction: "Jump"`). Ships with hardcoded defaults per core type (MAME, NES, Sega) and per-game overrides (e.g., Donkey Kong: A=Jump, B=Hammer).
- **DB override** (`games.keymapping` JSONB column): Admin can set custom key-to-action mappings per game. When present, DB values are merged on top of hardcoded defaults via `getKeyMappingWithDb()`.
- **Merge priority**: DB keymapping → game slug overrides → core defaults → MAME fallback.

#### `KeyMapping` Interface

```typescript
interface KeyMapping {
  up: string; upAction?: string;      // e.g., "↑", "Move Up"
  down: string; downAction?: string;
  left: string; leftAction?: string;
  right: string; rightAction?: string;
  a: string; aAction?: string;        // e.g., "Z", "Jump"
  b: string; bAction?: string;        // e.g., "X", "Shoot"
  start: string; startAction?: string;
  select: string; selectAction?: string;
  extras?: { label: string; key: string; action?: string }[];
}
```

#### DB JSONB Schema (`games.keymapping`)

```json
{
  "up": { "key": "↑", "action": "Move Up" },
  "a": { "key": "Z", "action": "Jump" },
  "b": { "key": "X", "action": "Shoot" },
  "extras": [{ "key": "1", "action": "Insert Coin" }]
}
```

#### UI: `KeymapOverlay.tsx`

- **Collapsible side panel** (right side of game player, desktop only)
- **Gamepad section**: NES-style wireframe controller with D-pad, A/B circles (with action labels like "Jump" below), Start/Select pills
- **Keyboard section**: Compact horizontal layout — arrow key cluster (inverted-T) on the left, action keycaps in the middle, system keys on the right. Each key rendered as a 3D-styled mechanical keycap with action label underneath.
- **Extras row**: Additional game-specific buttons (Coin, Gear, mouse clicks for Space Cadet pinball)
- Only keys relevant to the current game are shown — not a full keyboard.

#### Admin Configuration (`GameFormDialog.tsx`)

- Collapsible "Controls Mapping" section in the game create/edit form
- Grid of Key + Action input pairs for D-pad, A, B, Start, Select
- "Add Extra" button for additional custom buttons
- Pre-populated with defaults based on the selected core
- Only filled-in fields are saved; empty fields fall back to defaults
- Saved as JSONB to `games.keymapping`

#### Integration

- `FreePlay.tsx` and `ContestPlay.tsx` pass `game.keymapping` (cast as `DbKeymapping`) to `KeymapOverlay`
- The overlay calls `getKeyMappingWithDb(gameSlug, core, dbKeymapping)` to merge all layers

---

## 9. Routing

| Route | Page | Auth Required |
|-------|------|---------------|
| `/` | Landing page | No |
| `/games` | Game library | No |
| `/contest` | Contest listing | No |
| `/login` | Login | No |
| `/signup` | Signup | No |
| `/forgot-password` | Password reset request | No |
| `/reset-password` | Password reset form | No |
| `/about` | About | No |
| `/terms` | Terms of Service | No |
| `/privacy` | Privacy Policy | No |
| `/leaderboard` | Global public leaderboard | No |
| `/dashboard` | Role-based dashboard | Yes |
| `/free-play/:gameId` | Free play | No |
| `/contest-play/:contestSlug/:gameId` | Contest play | Yes |
| `/payment-success` | Post-Stripe wallet verification | Yes |
| `/payment-cancel` | Stripe checkout cancellation | Yes |
| `*` | 404 Not Found | No |

---

## 10. Data Fetching Strategy

- **Library**: TanStack Query v5
- **Stale time**: 2 minutes
- **Refetch on focus/remount**: Disabled
- **Cache invalidation**: Targeted after mutations (join contest, wallet changes, etc.)
- **Centralized hook**: `useDashboardData.ts` fetches all dashboard data in parallel
- **Global error handler**: Catches query errors and routes them through `handleNetworkError`
- **Smart retry**: Auth errors (401/403) skip retry; other errors retry up to 2 times

---

## 11. Design System

- **Tokens**: HSL-based CSS custom properties in `src/index.css`
- **Semantic classes**: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--card`, `--border`, etc.
- **Custom colors**: `--neon-green`, `--neon-pink` for gaming aesthetic accents
- **Components**: shadcn/ui with custom variants
- **Font**: Custom arcade-style font (`font-arcade` class)
- **Theme**: Dark-first gaming aesthetic with neon accents
- **Empty states**: Retro-styled with icon, arcade font title, and muted description

---

## 12. External Integrations

| Service | Purpose | Connection |
|---------|---------|------------|
| n8n Cloud | Score extraction from screenshots | Webhook URL in `useScoreExtraction.ts` |
| Supabase | Auth, DB, Storage, Edge Functions | Direct SDK client |
| EmulatorJS | Retro game emulation | Loaded in iframe via `game-frame.html` |
| Stripe | Wallet deposits | Checkout Sessions via edge functions |
| Resend | Contact form email delivery | REST API via edge function (`send-contact-email`) |

---

## 13. Utility Libraries

### `src/lib/datetime.ts`

| Function | Purpose |
|----------|---------|
| `datetimeLocalToIso(value)` | Converts `datetime-local` input to UTC ISO string |
| `isoToDatetimeLocal(value)` | Converts UTC ISO to local `datetime-local` value for form inputs |
| `formatDateTime(value)` | Locale-aware date/time display formatting |

### `src/lib/network-error-handler.ts`

See [Section 8.12](#812-network-error-handling).

---

## 14. Bug Fixes & Change Log

### 2026-04-12: Contact Form & Resend Integration

- **Contact Page**: Created a dedicated `/contact` page with a Zod-validated `react-hook-form` capturing user inquiries. Implemented dynamic loading states and success/error toasts.
- **Resend Edge Function**: Built and linked `send-contact-email` Supabase Edge Function to securely handle email dispatch via the Resend API to the administrative inbox (`admin@arcadechamps.com`).

### 2026-03-26: Leaderboard, Contest Management & Anti-Cheat Updates

- **Public global leaderboard** (`/leaderboard`): Server-side paginated page (10/page) with player search, contest filter, and game filter. Uses `get_global_leaderboard` and `get_global_leaderboard_count` SECURITY DEFINER RPCs for anonymous access.
- **Contest card leaderboards**: Collapsible, lazy-loaded top-5 leaderboard on each contest card on `/contest`. Uses `get_contest_leaderboard` RPC.
- **Prize image upload**: Admins can upload a prize image when creating/editing a contest (`contests.prize_image_path`). Displayed on the public contest card.
- **Input replay viewer**: Administrators can review player keylogging data (keyboard/gamepad inputs with timestamps) via `InputReplayViewer.tsx` in the Anti-Cheat panel and Contest Manager participant sessions.
- **Bottom navigation**: Added Leaderboard link to `BottomNav.tsx` for mobile access.
- **RPC consolidation**: Removed duplicate overloads of `get_global_leaderboard` and `get_global_leaderboard_count` that caused ambiguous function resolution errors.

### 2026-03-17: Comprehensive Feature Updates

- **Pagination**: Added `TablePagination` component and `usePagination` hook across Wallet, Play History, Leaderboard, Admin Players, Admin Sessions, and Newsletter (server-side)
- **Username display**: Unique usernames shown on leaderboards, header dropdown, and dashboard greeting
- **Form validation**: Migrated to Zod schemas for profiles, passwords, payout methods, and wallet amounts
- **Scroll fixes**: `ScrollToTop` on route change; scroll lock during contest gameplay
- **Payout flow**: Users configure PayPal/Venmo/CashApp methods; request withdrawals from wallet; admins process payouts
- **Password management**: Forgot password flow (`/forgot-password` → email → `/reset-password`); in-dashboard change password with re-authentication
- **Onboarding tours**: Decentralized per-section tours (Wallet, Profile, Contests) with `OnboardingTour` component, unique localStorage keys, SVG cutout highlights
- **Newsletter management**: Admin panel with search, server-side pagination, CSV export, bulk delete
- **Cookie consent**: GDPR banner with accept/decline, localStorage persistence
- **SEO**: `PageMeta` component with Open Graph, Twitter Cards, JSON-LD, canonical URLs
- **Network error handling**: Centralized error classification with retry toasts, offline detection, global query error handler

### 2026-03-06: Anti-Cheat False Clean Verdicts

**Problem**: When the WASM engine was not ready or failed, `submitScore()` silently returned a default `clean` verdict with no reason or evidence.

**Fix**: All failure paths now return `suspected` status with specific reason codes (`WASM_NOT_READY`, `EMPTY_WASM_RESPONSE`, `WASM_ERROR`).

### 2026-03-04: Wallet Double-Crediting Bug

**Problem**: Two duplicate triggers on `wallet_transactions` both called `apply_wallet_transaction()`, causing double credits.

**Fix**: Dropped the duplicate trigger via migration `20260304150804`.

### 2026-03-06: Edge Function TypeScript Errors

**Problem**: `catch (error)` blocks accessed `error.message` without type narrowing.

**Fix**: Added `catch (error: unknown)` with proper type casting across edge functions.

---

## 15. Best Practices

1. **No direct color classes** — all colors via semantic Tailwind tokens
2. **RLS on every table** — with `is_admin()` SECURITY DEFINER function
3. **Service Role for server ops** — edge functions use service role key for storage/DB writes
4. **No raw SQL from client** — typed Supabase client API only
5. **Targeted cache invalidation** — no full page reloads after mutations
6. **Idempotent payments** — `stripe_session_id` check prevents duplicate wallet credits
7. **Single trigger rule** — exactly one trigger per function on `wallet_transactions`
8. **Explicit anti-cheat failures** — unverified sessions flagged as `suspected`, never silently `clean`
9. **Screenshot evidence chain** — upload → store path → admin review via signed URLs
10. **Score normalization** — handles plain numbers, strings, and objects from webhook
11. **Zod-first validation** — all user input validated with Zod schemas before API calls
12. **Centralized error handling** — all network/Supabase errors route through `handleNetworkError`
13. **Decentralized onboarding** — each section owns its tour steps and localStorage key
14. **Consistent pagination** — shared `TablePagination` component for all long lists
15. **Offline resilience** — global online/offline listeners with user-facing toasts
