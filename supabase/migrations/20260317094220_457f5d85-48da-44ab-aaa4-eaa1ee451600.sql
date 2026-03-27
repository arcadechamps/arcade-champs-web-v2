-- Grant INSERT to anon and authenticated so the RLS policy can take effect
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;

-- Grant SELECT, DELETE to authenticated (for admin RLS policies)
GRANT SELECT, DELETE ON public.newsletter_subscribers TO authenticated;
