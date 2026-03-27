-- Add payout method fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN payout_method text CHECK (payout_method IN ('paypal', 'venmo', 'cashapp')),
  ADD COLUMN payout_handle text;
