
ALTER TABLE public.contests ADD COLUMN prize_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.contest_winners ADD COLUMN paid boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT au.id, au.email::text FROM auth.users au WHERE au.id = ANY(user_ids)
$$;
