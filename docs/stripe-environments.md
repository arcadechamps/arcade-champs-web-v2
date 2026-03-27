# Stripe Environment Configuration

## Overview

ArcadeChamps separates Stripe keys by environment so testing never touches live payments.

## How It Works

| Environment | Secret Value | Effect |
|-------------|-------------|--------|
| **Test** (Preview) | `sk_test_...` | Stripe Test Mode — no real charges |
| **Live** (Production) | `sk_live_...` | Real payments processed |

Both `create-wallet-topup` and `verify-wallet-topup` edge functions use `Deno.env.get("STRIPE_SECRET_KEY")`, so the same code works in both environments automatically.

## Test Cards

When using the Test environment, use these Stripe test cards:

| Card Number | Result |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 3220` | Requires 3D Secure |

Use any future expiry date and any 3-digit CVC.

## Verifying Environment Separation

1. Open the **Preview** (Test environment)
2. Go to Dashboard → Add Funds → enter any amount
3. Stripe Checkout should show a **"Test mode"** banner at the top
4. Complete with test card `4242 4242 4242 4242`
5. Confirm wallet is credited in the Test environment
6. Confirm your **Live** Stripe Dashboard shows no new transactions

## Updating Keys

Secrets are managed in the Supabase project settings:
- **Test key**: Set via Lovable secrets or Supabase Dashboard (Edge Functions > Secrets)
- **Live key**: Set in the production Supabase project

## No Frontend Keys Required

The platform uses Stripe Checkout (server-side redirect), so no publishable keys (`pk_test_` / `pk_live_`) are needed in the frontend code.
