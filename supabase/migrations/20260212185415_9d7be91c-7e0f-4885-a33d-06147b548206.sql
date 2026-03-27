
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.is_admin = true
  );
$$;
