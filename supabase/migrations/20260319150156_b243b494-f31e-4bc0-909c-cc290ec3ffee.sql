DROP FUNCTION IF EXISTS public.get_display_names(uuid[]);

CREATE FUNCTION public.get_display_names(user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select p.user_id, p.display_name, p.username, p.avatar_url
  from public.profiles p
  where p.user_id = any(user_ids)
$$;