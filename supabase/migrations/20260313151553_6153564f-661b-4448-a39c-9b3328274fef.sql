
-- 1. Update handle_new_auth_user to stop inserting is_admin
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_email text;
BEGIN
  v_email := lower(coalesce(new.email, ''));

  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(v_email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Auto-assign admin role for the bootstrap email
  IF v_email = 'admin@arcadechamps.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.wallets (user_id, balance_cents)
  VALUES (new.id, 0) ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

-- 2. Lock down profiles_update_own to prevent is_admin changes
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (
    (auth.uid() = user_id OR is_admin())
    AND (is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.user_id = profiles.user_id))
  );
