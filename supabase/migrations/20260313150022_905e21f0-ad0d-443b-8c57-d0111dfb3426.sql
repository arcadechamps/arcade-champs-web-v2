
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate existing admins before updating is_admin() function
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role FROM public.profiles WHERE is_admin = true
ON CONFLICT DO NOTHING;

-- Replace is_admin() to use user_roles instead of profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Only admins can read/write roles (uses the updated is_admin())
CREATE POLICY "roles_select_admin" ON public.user_roles
  FOR SELECT USING (public.is_admin());
CREATE POLICY "roles_write_admin" ON public.user_roles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Generic has_role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Update handle_new_auth_user to stop setting is_admin on profiles
-- and instead insert into user_roles for bootstrap admin
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_email text;
BEGIN
  v_email := lower(coalesce(new.email, ''));

  INSERT INTO public.profiles (user_id, display_name, is_admin)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(v_email, '@', 1)),
    false
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
