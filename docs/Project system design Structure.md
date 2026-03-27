# ArcadeChamps — Project System Design & Architecture

> Last updated: 2026-02-26  
> Purpose: Comprehensive system architecture reference for developers, project managers, and AI agents.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project File Structure](#3-project-file-structure)
4. [Application Routing & Navigation](#4-application-routing--navigation)
5. [Authentication Flow](#5-authentication-flow)
6. [Database Schema & Relationships](#6-database-schema--relationships)
7. [Row-Level Security (RLS)](#7-row-level-security-rls)
8. [Storage Architecture](#8-storage-architecture)
9. [Wallet & Payment System (Stripe)](#9-wallet--payment-system-stripe)
10. [Contest System & Gameplay Flow](#10-contest-system--gameplay-flow)
11. [Score Extraction Pipeline](#11-score-extraction-pipeline)
12. [Anti-Cheat System](#12-anti-cheat-system)
13. [Edge Functions](#13-edge-functions)
14. [Frontend Data Flow](#14-frontend-data-flow)
15. [Design System](#15-design-system)
16. [Environment & Secrets](#16-environment--secrets)
17. [Deployment](#17-deployment)
18. [Testing the Wallet Top-Up Flow (QA Guide)](#18-testing-the-wallet-top-up-flow-qa-guide)

---

## 1. Project Overview

**ArcadeChamps** is a competitive retro gaming platform where players:
- Play classic arcade games via browser-based emulation (EmulatorJS)
- Enter paid contests with real-money entry fees
- Compete for leaderboard positions and prize payouts
- Manage a wallet funded via Stripe payments

The platform has two user roles:
- **Players** — join contests, play games, earn scores, manage wallet
- **Admins** — manage games, contests, participants, review anti-cheat evidence, declare winners

**Live URLs:**
- Preview: `https://id-preview--10bdac8c-dab0-4516-af44-b8aed2d7286b.lovable.app`
- Production: `https://acv2.lovable.app`

---

## 2. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend Framework | React 18 + TypeScript | Vite bundler |
| Styling | Tailwind CSS + shadcn/ui | HSL-based semantic design tokens |
| Routing | react-router-dom v6 | Client-side SPA routing |
| Server State | TanStack Query v5 | 2-min stale time, targeted cache invalidation |
| Auth | Supabase Auth | Email/password, JWT-based |
| Database | Supabase (PostgreSQL) | RLS-protected, service role for server ops |
| Storage | Supabase Storage | 4 buckets (2 public, 2 private) |
| Edge Functions | Supabase Edge Functions (Deno) | Serverless backend logic |
| Payments | Stripe Checkout | Test mode via `STRIPE_TEST_SECRET_KEY` |
| Game Engine | EmulatorJS | Runs in sandboxed iframe |
| Score Extraction | n8n Cloud Webhook | External AI-based OCR |
| Anti-Cheat | Custom WASM module | Client-side input pattern analysis |

---

## 3. Project File Structure

```
src/
├── App.tsx                         # Root — providers, routing
├── main.tsx                        # Vite entry point
├── index.css                       # Design tokens (HSL CSS variables)
├── assets/                         # Static images
├── components/
│   ├── ui/                         # shadcn/ui primitives
│   ├── dashboard/                  # Dashboard-specific components
│   │   ├── AdminContestManager     # Contest CRUD, ban/unban, winners
│   │   ├── AdminGameManager        # Game CRUD, ROM/thumbnail upload
│   │   ├── AdminOverview           # Admin stats & activity
│   │   ├── AdminPlayerList         # All registered players
│   │   ├── AdminSessions           # Session monitoring
│   │   ├── AdminAntiCheat          # Cheat detection logs
│   │   ├── DashboardContestGames   # Player's joined contest games
│   │   ├── DashboardFreeGames      # Free play listing
│   │   ├── DashboardSidebar        # Dashboard navigation
│   │   ├── GameFormDialog          # Game create/edit form
│   │   ├── Leaderboard             # Per-contest & overall rankings
│   │   ├── PlayerContests          # Find & join contests
│   │   ├── PlayerOverview          # Player stats & streaks
│   │   ├── SessionHistory          # Past sessions with scores
│   │   └── WalletPanel             # Balance, add funds, transactions
│   ├── GamePlayer.tsx              # EmulatorJS iframe wrapper
│   ├── ContestRulesModal.tsx       # Pre-game rules & fee confirmation
│   ├── Header.tsx / Footer.tsx     # Global layout
│   └── Layout.tsx / BottomNav.tsx  # Page wrapper & mobile nav
├── data/
│   ├── games.ts                    # Static game metadata
│   └── games-config.ts            # EmulatorJS core/ROM config
├── hooks/
│   ├── useAuth.tsx                 # Auth context & provider
│   ├── useDashboardData.ts        # Parallel dashboard data fetching
│   ├── useScoreExtraction.ts      # n8n webhook mutation
│   ├── useAntiCheat.ts            # WASM anti-cheat hook
│   └── use-mobile.tsx             # Responsive breakpoint
├── integrations/supabase/
│   ├── client.ts                  # Supabase client singleton
│   └── types.ts                   # Auto-generated DB types (read-only)
├── pages/
│   ├── Index.tsx                  # Landing page
│   ├── Games.tsx                  # Public game library
│   ├── Contest.tsx                # Public contest listing
│   ├── ContestPlay.tsx            # Contest gameplay (timer, screenshot, score)
│   ├── FreePlay.tsx               # Free play game page
│   ├── Dashboard.tsx              # Role-based dashboard
│   ├── Login.tsx / Signup.tsx     # Auth pages
│   ├── PaymentSuccess.tsx         # Post-Stripe verification page
│   └── NotFound.tsx               # 404
├── types/database.ts              # Manual TS interfaces
├── utils/contestStatus.ts         # Contest status helpers
└── lib/utils.ts                   # Utility functions (cn, etc.)

supabase/
├── config.toml                    # Edge function settings
└── functions/
    ├── create-wallet-topup/       # Creates Stripe Checkout session
    ├── verify-wallet-topup/       # Verifies payment & credits wallet
    ├── upload-screenshot/         # Uploads gameplay screenshots
    ├── upload-recording/          # Uploads gameplay recordings
    └── update-contest-statuses/   # Auto-transitions contest lifecycle

public/
├── game-frame.html               # EmulatorJS iframe runner
├── arcade_core.js / .wasm        # WASM anti-cheat module
├── SpaceCadet/                   # Custom game (3D Pinball)
└── emulator/mame/                # Local ROM files
```

---

## 4. Application Routing & Navigation

```
App.tsx
└── BrowserRouter
    ├── /                          → Index (public)
    ├── /about                     → About (public)
    ├── /games                     → Games (public)
    ├── /contest                   → Contest (public)
    ├── /login                     → Login (public)
    ├── /signup                    → Signup (public)
    ├── /free-play/:gameId         → FreePlay (public)
    ├── /contest-play/:slug/:id    → ContestPlay (🔒 ProtectedRoute)
    ├── /dashboard                 → Dashboard (🔒 ProtectedRoute)
    ├── /payment-success           → PaymentSuccess (🔒 ProtectedRoute)
    └── /*                         → NotFound
```

**ProtectedRoute component**: checks `useAuth()` — if no user, redirects to `/login`.

**Provider hierarchy** (App.tsx):
```
QueryClientProvider → AuthProvider → TooltipProvider → BrowserRouter
```

---

## 5. Authentication Flow

### Sign-Up Flow
```
User fills form (email, password, display_name)
        │
        ▼
Signup.tsx → useAuth().signUp()
        │
        ▼
supabase.auth.signUp({ email, password, data: { display_name } })
        │
        ▼
Supabase creates auth.users record
        │
        ▼
DB Trigger: handle_new_auth_user()
        ├── Creates profiles row (user_id, display_name, is_admin)
        │   └── If email = admin@arcadechamps.com → is_admin = true
        └── Creates wallets row (user_id, balance_cents = 0)
        │
        ▼
User redirected to /login with success toast
```

### Sign-In Flow
```
User fills form (email, password)
        │
        ▼
Login.tsx → useAuth().signIn()
        │
        ▼
supabase.auth.signInWithPassword({ email, password })
        │
        ▼
Supabase returns session (JWT access_token + refresh_token)
        │
        ▼
AuthProvider stores session in React state
        │
        ▼
AuthProvider fetches profile from profiles table
        │
        ▼
User redirected to /dashboard
```

### Session Persistence
- **Storage**: `localStorage` (configured in Supabase client)
- **Auto-refresh**: Enabled (`autoRefreshToken: true`)
- **Auth state listener**: `supabase.auth.onAuthStateChange()` syncs user/profile on tab focus

### Auth Context (useAuth hook)
Exposes: `user`, `session`, `profile`, `loading`, `signUp()`, `signIn()`, `signOut()`

---

## 6. Database Schema & Relationships

### Entity Relationship Diagram (Simplified)

```
auth.users (managed by Supabase)
    │
    ▼ (trigger: handle_new_auth_user)
profiles (user_id PK)
    │
    ├── wallets (user_id PK, 1:1)
    ├── wallet_transactions (user_id FK, 1:many)
    ├── contest_participants (user_id + contest_id, many:many)
    ├── contest_winners (user_id + contest_id)
    ├── game_sessions (user_id FK)
    └── anti_cheat_logs (user_id FK)

contests (id PK)
    ├── contest_games (contest_id + game_id, many:many) → games
    ├── contest_participants (contest_id FK)
    ├── contest_winners (contest_id FK, 1:1)
    └── game_sessions (contest_id FK)

games (id PK)
    ├── contest_games (game_id FK)
    ├── game_sessions (game_id FK)
    └── anti_cheat_logs (game_id FK)
```

### Table Details

| Table | PK | Key Columns | Purpose |
|-------|-----|------------|---------|
| `profiles` | `user_id` (uuid) | `display_name`, `username`, `is_admin` | User identity & role |
| `wallets` | `user_id` (uuid) | `balance_cents` (bigint) | User balance in cents |
| `wallet_transactions` | `id` (uuid) | `user_id`, `type` (enum), `status` (enum), `amount_cents`, `meta` (jsonb) | Financial ledger |
| `games` | `id` (uuid) | `slug`, `title`, `core`, `rom_path`, `thumbnail_path`, `is_active` | Game library |
| `contests` | `id` (uuid) | `slug`, `title`, `status` (enum), `session_fee_cents`, `session_duration_seconds`, `starts_at`, `ends_at` | Contest definitions |
| `contest_games` | composite (`contest_id`, `game_id`) | `is_active`, `sort_order` | Many-to-many link |
| `contest_participants` | composite (`contest_id`, `user_id`) | `is_banned`, `ban_reason`, `joined_at` | Enrollment & moderation |
| `contest_winners` | `contest_id` (1:1) | `user_id`, `winning_score`, `payout_cents`, `declared_by` | Winner records |
| `game_sessions` | `id` (uuid) | `session_id` (text, unique), `user_id`, `contest_id`, `game_id`, `status`, `score`, `screenshot_path`, `recording_path`, `start_timestamp_ms`, `end_timestamp_ms`, `allowed_duration_seconds` | Individual play sessions |
| `anti_cheat_logs` | `id` (uuid) | `session_id`, `user_id`, `contest_id`, `game_id`, `status` (enum), `reason`, `evidence` (jsonb) | Cheat detection records |

### Enums

| Enum | Values |
|------|--------|
| `contest_status` | `upcoming`, `active`, `closed` |
| `session_status` | `active`, `ended`, `flagged` |
| `tx_type` | `topup`, `session_fee`, `payout`, `admin_adjust` |
| `tx_status` | `pending`, `succeeded`, `failed` |
| `cheat_status` | `clean`, `suspected`, `confirmed` |

### Database Functions & Triggers

| Function | Type | Purpose |
|----------|------|---------|
| `handle_new_auth_user()` | Trigger on `auth.users` INSERT | Auto-creates `profiles` + `wallets` rows |
| `apply_wallet_transaction()` | Trigger on `wallet_transactions` INSERT/UPDATE | Auto-adjusts `wallets.balance_cents` when tx status = `succeeded`. For `topup`/`payout`/`admin_adjust` → adds amount. For `session_fee` → subtracts amount. |
| `is_admin()` | SECURITY DEFINER function | Returns `true` if current `auth.uid()` has `is_admin = true` in profiles. Used in all RLS policies. |

---

## 7. Row-Level Security (RLS)

All tables have RLS enabled. General patterns:

| Pattern | Tables | Rule |
|---------|--------|------|
| **Own + Admin read** | `profiles`, `wallets`, `wallet_transactions`, `game_sessions`, `contest_participants`, `anti_cheat_logs` | `SELECT WHERE auth.uid() = user_id OR is_admin()` |
| **Own + Admin write** | `game_sessions`, `wallet_transactions`, `contest_participants`, `anti_cheat_logs` | `INSERT WHERE auth.uid() = user_id OR is_admin()` |
| **Admin-only write** | `games`, `contests`, `contest_games`, `contest_winners` | `ALL WHERE is_admin()` |
| **Public read** | `games`, `contests`, `contest_games`, `contest_winners` | `SELECT WHERE true` |
| **No DELETE** | Most tables | DELETE policies not defined (blocked by default) |

**Critical**: Edge functions use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS when performing server-side operations (e.g., crediting wallets after Stripe payment).

---

## 8. Storage Architecture

| Bucket | Public | Purpose | Access Pattern |
|--------|--------|---------|----------------|
| `game-roms` | ✅ Yes | ROM files for EmulatorJS | Public read, admin upload |
| `game-thumbnails` | ✅ Yes | Game cover images | Public read, admin upload |
| `gameplay-screenshots` | ❌ No | Contest session evidence (PNG) | User uploads own, admin reads all |
| `gameplay-recordings` | ❌ No | Contest session recordings (WebM) | User uploads own, admin reads all |

### Screenshot Upload Flow
```
Timer expires in ContestPlay.tsx
        │
        ▼
GamePlayer.captureScreenshot()
        │
        ▼
Iframe postMessage("CAPTURE_SCREENSHOT") → game-frame.html
        │
        ▼
Canvas → toDataURL("image/png") → base64
        │
        ▼
postMessage("emulator_screenshot", data) back to parent
        │
        ▼
GamePlayer converts base64 → File (PNG blob)
        │
        ▼
onScreenshot callback → ContestPlay.handleScreenshot()
        │
        ▼
Fetch POST to upload-screenshot edge function
        │  Headers: Authorization: Bearer <JWT>
        │  Body: FormData { screenshot: File, session_id: string }
        │
        ▼
Edge function validates JWT, uploads to:
  gameplay-screenshots/{userId}/{sessionId}.png
        │
        ▼
Updates game_sessions.screenshot_path
```

### Recording Upload Flow
Same pattern as screenshots but:
- Triggered by `GamePlayer.stopRecording()`
- Uses `upload-recording` edge function
- Stored as `.webm` in `gameplay-recordings` bucket
- MediaRecorder captures canvas stream during gameplay

---

## 9. Wallet & Payment System (Stripe)

### Architecture Overview
```
┌──────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   Frontend   │────▶│  create-wallet-topup  │────▶│   Stripe    │
│  WalletPanel │     │   (Edge Function)     │     │  Checkout   │
└──────────────┘     └──────────────────────┘     └──────┬──────┘
                                                         │
                                                    User pays
                                                         │
                                                         ▼
┌──────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  PaymentSuccess│◀──│  verify-wallet-topup  │◀───│   Stripe    │
│    page      │     │   (Edge Function)     │     │  Redirect   │
└──────────────┘     └──────────────────────┘     └─────────────┘
                              │
                              ▼
                     wallet_transactions INSERT
                     (type: topup, status: succeeded)
                              │
                              ▼
                     DB Trigger: apply_wallet_transaction()
                              │
                              ▼
                     wallets.balance_cents += amount
```

### Step-by-Step Wallet Top-Up Flow

#### Step 1: User initiates deposit
- **Component**: `WalletPanel.tsx` → "Add Funds" button opens dialog
- **UI**: Preset amounts ($5, $10, $25, $50) + custom input
- **Validation**: $1.00 – $1,000.00 range (100 – 100,000 cents)

#### Step 2: Create Stripe Checkout Session
- **Frontend call**: `supabase.functions.invoke("create-wallet-topup", { body: { amount_cents } })`
- **Edge function** (`create-wallet-topup/index.ts`):
  1. Extracts JWT from `Authorization` header
  2. Validates user via `supabaseClient.auth.getUser(token)`
  3. Initializes Stripe with `STRIPE_TEST_SECRET_KEY` (falls back to `STRIPE_SECRET_KEY`)
  4. Looks up existing Stripe customer by email
  5. Creates `stripe.checkout.sessions.create()` with:
     - `mode: "payment"` (one-time charge)
     - `price_data` with dynamic `unit_amount` (cents)
     - `success_url`: `{origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`
     - `cancel_url`: `{origin}/dashboard`
     - `metadata`: `{ user_id, amount_cents, type: "wallet_topup" }`
  6. Returns `{ url: session.url }` to frontend

#### Step 3: Stripe Checkout
- Frontend redirects: `window.location.href = data.url`
- User sees Stripe hosted checkout page
- In test mode: "Test mode" banner visible, use card `4242 4242 4242 4242`

#### Step 4: Payment Success Verification
- Stripe redirects to `/payment-success?session_id=cs_test_xxx`
- **Component**: `PaymentSuccess.tsx`
  1. Extracts `session_id` from URL params
  2. Calls `supabase.functions.invoke("verify-wallet-topup", { body: { session_id } })`
- **Edge function** (`verify-wallet-topup/index.ts`):
  1. Authenticates user via JWT
  2. Retrieves Stripe session: `stripe.checkout.sessions.retrieve(session_id)`
  3. Validates: `payment_status === "paid"` and `metadata.user_id === userId`
  4. **Idempotency check**: queries `wallet_transactions` for existing record with same `stripe_session_id` in `meta` column
  5. If not duplicate: inserts `wallet_transactions` row with `type: "topup"`, `status: "succeeded"`, `amount_cents`, `meta: { stripe_session_id, stripe_payment_intent }`
  6. DB trigger `apply_wallet_transaction()` automatically updates `wallets.balance_cents`
  7. Returns `{ success: true, amount_cents }` or `{ success: true, already_credited: true }`

#### Step 5: UI Update
- `PaymentSuccess.tsx` shows success/error state
- User clicks "Go to Dashboard" → navigates to `/dashboard`
- Dashboard wallet data refreshes via TanStack Query cache invalidation

### Stripe Environment Strategy
- **Test mode**: `STRIPE_TEST_SECRET_KEY` is prioritized in edge functions
- **Production**: Falls back to `STRIPE_SECRET_KEY`
- **No frontend keys needed** — Stripe Checkout is fully server-side redirect
- Secret selection: `Deno.env.get("STRIPE_TEST_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY")`

### Entry Fee Deduction (Contest Play)
```
ContestRulesModal → "Accept & Play"
        │
        ▼
Check wallets.balance_cents >= session_fee_cents
        │
        ▼
INSERT wallet_transactions (type: session_fee, status: succeeded)
        │
        ▼
DB Trigger subtracts from wallets.balance_cents
        │
        ▼
Invalidate wallet cache → UI updates immediately
```

---

## 10. Contest System & Gameplay Flow

### Contest Lifecycle
```
Admin creates contest (status: upcoming)
        │
        ▼
starts_at reached → status: active (via update-contest-statuses edge function)
        │
        ▼
Players join, play sessions, scores recorded
        │
        ▼
ends_at reached → status: closed
        │
        ▼
Admin declares winner (contest_winners INSERT, payout transaction)
```

### Contest Gameplay Flow (ContestPlay.tsx)

```
1. User navigates to /contest-play/:contestSlug/:gameId
        │
        ▼
2. Fetch contest + game data from Supabase
   Check participant status & ban status
        │
        ▼
3. Show ContestRulesModal
   ├── Free contest: can dismiss with "Don't remind me" (localStorage)
   └── Paid contest: always shown, displays fee
        │
        ▼
4. User clicks "Accept & Play"
   ├── If paid: deduct session_fee from wallet
   └── setGameStarted(true)
        │
        ▼
5. Create game_sessions record
   ├── session_id = crypto.randomUUID()
   ├── status: "active"
   ├── start_timestamp_ms: Date.now()
   └── allowed_duration_seconds from contest
        │
        ▼
6. Start anti-cheat tracking
   Start countdown timer (contest.session_duration_seconds)
        │
        ▼
7. GamePlayer renders EmulatorJS iframe
   ├── Iframe loads game-frame.html with ROM config
   ├── On game start signal → start recording (MediaRecorder)
   └── Keyboard events forwarded to anti-cheat WASM
        │
        ▼
8. Timer reaches 0
   ├── Capture screenshot (canvas → PNG)
   ├── Stop recording (MediaRecorder → WebM blob)
   ├── Upload screenshot → upload-screenshot edge function
   ├── Upload recording → upload-recording edge function
   ├── Send screenshot to n8n webhook → score extraction
   ├── Submit anti-cheat verdict → anti_cheat_logs
   └── Update game_sessions (score, status: ended, timestamps)
        │
        ▼
9. Show "Time's Up" overlay with extracted score
   Invalidate dashboard cache
```

---

## 11. Score Extraction Pipeline

```
Screenshot (PNG File)
        │
        ▼
useScoreExtraction.ts → mutationFn
        │
        ▼
POST to n8n webhook URL
  FormData: { data: File, gamename: string }
        │
        ▼
n8n Cloud processes image (AI/OCR)
        │
        ▼
Returns score in one of these formats:
  ├── Plain number: 12500
  ├── String number: "12500"
  ├── Object: { score: 12500 }
  └── Object with string: { score: "12500" }
        │
        ▼
Normalization logic extracts numeric score
        │
        ▼
Score saved to game_sessions.score
```

**Webhook URL**: `https://arcadechamps.app.n8n.cloud/webhook/71c8c8f1-b181-4809-9a17-ba1cf226feaa`

---

## 12. Anti-Cheat System

### Architecture
- **Client-side**: WASM module (`public/arcade_core.js` + `.wasm`)
- **Hook**: `useAntiCheat.ts` wraps WASM lifecycle
- **Input capture**: Keyboard events from game iframe → forwarded via `postMessage` → fed into WASM analysis
- **Verdict**: Generated at session end with status (`clean` / `suspected` / `confirmed`)
- **Storage**: `anti_cheat_logs` table with `evidence` JSONB column

### Flow
```
Game iframe emits keyboard events
        │
        ▼
GamePlayer forwards via onKeyboardEvent callback
        │
        ▼
ContestPlay.handleKeyboardEvent → antiCheat.notifyEvent()
        │
        ▼
WASM module analyzes input patterns
        │
        ▼
Timer expires → antiCheat.submitScore(score)
        │
        ▼
Returns verdict { status, reason, evidence }
        │
        ▼
INSERT into anti_cheat_logs
```

---

## 13. Edge Functions

All edge functions have `verify_jwt = false` in `supabase/config.toml` (JWT validated manually in code).

| Function | Purpose | Auth | Key Operations |
|----------|---------|------|----------------|
| `create-wallet-topup` | Creates Stripe Checkout session | JWT via `getUser(token)` | Stripe API, returns checkout URL |
| `verify-wallet-topup` | Verifies Stripe payment, credits wallet | JWT via `getUser(token)` | Stripe API, service role INSERT to `wallet_transactions` |
| `upload-screenshot` | Receives & stores gameplay screenshot | JWT via `getUser(token)` | Service role upload to private storage, updates `game_sessions` |
| `upload-recording` | Receives & stores gameplay recording | JWT via `getUser(token)` | Service role upload to private storage, updates `game_sessions` |
| `update-contest-statuses` | Auto-transitions contest lifecycle | None (cron/manual) | Service role UPDATE on `contests` |

### Auth Pattern (all edge functions)
```typescript
const authHeader = req.headers.get("Authorization");
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error } = await supabaseClient.auth.getUser(token);
// ⚠️ Do NOT use getClaims() — not supported in this environment
```

### Service Role Usage
Edge functions that write to protected tables use a separate admin client:
```typescript
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);
```

---

## 14. Frontend Data Flow

### State Management
- **Auth state**: React Context (`AuthProvider` → `useAuth()`)
- **Server state**: TanStack Query v5 (`useQuery` / `useMutation`)
- **No global state library** — local component state + query cache

### TanStack Query Configuration
```typescript
const queryClient = new QueryClient();
// Default: staleTime = 2 min, no refetchOnFocus/refetchOnMount
```

### Data Fetching Pattern
```
Component mounts
        │
        ▼
useQuery({ queryKey: ["dashboard", userId], queryFn: ... })
        │
        ▼
Supabase client SDK call (typed via auto-generated types)
        │
        ▼
RLS filters results to user's own data
        │
        ▼
Data rendered in component
```

### Cache Invalidation Pattern
After mutations (join contest, wallet topup, score submission):
```typescript
queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
queryClient.invalidateQueries({ queryKey: ["wallet-balance", user.id] });
```

### Centralized Dashboard Data
`useDashboardData.ts` fetches all dashboard data in parallel queries:
- Profile, wallet, transactions, sessions, contests, games, participants

---

## 15. Design System

### Token Architecture
```css
/* index.css — HSL-based semantic tokens */
:root {
  --background: <hsl>;
  --foreground: <hsl>;
  --primary: <hsl>;
  --primary-foreground: <hsl>;
  --secondary: <hsl>;
  --muted: <hsl>;
  --accent: <hsl>;
  --card: <hsl>;
  --border: <hsl>;
  --destructive: <hsl>;
  /* ... etc */
}
```

### Rules
1. **Never use raw color classes** (`text-white`, `bg-black`) — always use semantic tokens
2. **Dark-first** gaming aesthetic with neon accents
3. **Font**: Custom arcade-style font (`font-arcade` class)
4. **Components**: shadcn/ui with custom variants

---

## 16. Environment & Secrets

### Frontend (.env — auto-populated)
| Variable | Source |
|----------|--------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

### Edge Function Secrets (Supabase Dashboard)
| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Auto-provided |
| `SUPABASE_ANON_KEY` | Auto-provided |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS in edge functions |
| `STRIPE_TEST_SECRET_KEY` | Stripe test mode payments |
| `STRIPE_SECRET_KEY` | Stripe production payments |

**⚠️ No private keys are stored in frontend code. All Stripe operations happen server-side via edge functions.**

---

## 17. Deployment

### Frontend
- Built by Vite → static SPA
- Deployed via Lovable publish button
- **Frontend changes require clicking "Update"** in publish dialog

### Backend (Edge Functions)
- **Deploy automatically** when code changes
- Located in `supabase/functions/`
- Runtime: Deno

### Database
- Migrations in `supabase/migrations/` (read-only, managed by Supabase)
- Changes applied via Lovable migration tool

---

## 18. Testing the Wallet Top-Up Flow (QA Guide)

### Prerequisites
- `STRIPE_TEST_SECRET_KEY` set in Supabase Edge Function secrets
- A test user account created and logged in

### Step-by-Step Test

1. **Log in** at `/login` with test credentials
2. **Navigate** to Dashboard → Wallet tab
3. **Click "Add Funds"** button
4. **Select $5** preset (or enter custom amount)
5. **Click "Pay with Stripe"**
6. **Verify**: Redirected to Stripe Checkout
   - ✅ "Test mode" banner should be visible at top
   - ✅ Amount shows $5.00
7. **Enter test card**: `4242 4242 4242 4242`
   - Expiry: any future date (e.g., `12/34`)
   - CVC: any 3 digits (e.g., `123`)
   - Name/ZIP: any values
8. **Click "Pay"**
9. **Verify**: Redirected to `/payment-success?session_id=cs_test_xxx`
   - ✅ Green checkmark with "+$5.00"
   - ✅ "Payment Successful!" message
10. **Click "Go to Dashboard"**
11. **Verify wallet balance** increased by $5.00
12. **Check transaction history** shows "Top Up" entry with status "succeeded"

### Edge Cases to Test
- **Double-click prevention**: Refresh `/payment-success` page — should show "Already Credited"
- **Insufficient balance for contest**: Try playing a contest with fee > balance
- **Cancel at Stripe**: Click back/cancel on Stripe page → returns to `/dashboard`
- **Invalid amount**: Try entering $0 or $2000 → validation error in dialog

### Stripe Test Cards
| Card | Behavior |
|------|----------|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 3220` | Requires 3D Secure |

---

*End of document. For EmulatorJS configuration details, see `docs/emulatorJS-options.md`. For Stripe environment management, see `docs/stripe-environments.md`.*
