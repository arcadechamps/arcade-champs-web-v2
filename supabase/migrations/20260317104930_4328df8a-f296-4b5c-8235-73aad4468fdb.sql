-- Fix admin withdrawal rejection permissions:
-- authenticated users need UPDATE privilege for PostgREST to allow updates,
-- while RLS policy wallet_tx_update_admin still restricts updates to admins only.
GRANT UPDATE (status) ON TABLE public.wallet_transactions TO authenticated;
