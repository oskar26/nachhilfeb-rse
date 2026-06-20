-- ============================================================
-- PHASE 8 MIGRATION v3: Paste this into the Supabase SQL Editor
-- Run the ENTIRE script at once.
-- ============================================================

-- 1. Add missing columns (safe / idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{"email_visible": false, "phone_visible": false}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

-- 2. Fix handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  raw_name text;
  derived_name text;
BEGIN
  raw_name := new.raw_user_meta_data->>'full_name';
  IF raw_name IS NULL OR raw_name = '' THEN
    derived_name := split_part(new.email, '@', 1);
  ELSE
    derived_name := raw_name;
  END IF;

  INSERT INTO public.profiles (id, full_name, display_name, email)
  VALUES (new.id, derived_name, derived_name, new.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Drop all old functions/triggers
DROP TRIGGER IF EXISTS ensure_profile_protection ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_fields();
DROP FUNCTION IF EXISTS public.redeem_code(text);

-- 4. Create redeem_code with session variable bypass
CREATE OR REPLACE FUNCTION public.redeem_code(secret_code text)
RETURNS text AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN 'invalid';
  END IF;

  -- Signal the protection trigger to allow this update
  PERFORM set_config('app.allow_role_change', 'true', true);

  IF secret_code = 'SV_FWG_ADMIN_2026' THEN
    UPDATE public.profiles SET role = 'sv_admin', is_verified = true WHERE id = uid;
    RETURN 'admin';
  ELSIF secret_code = 'VERIFY_ME_NOW' THEN
    UPDATE public.profiles SET is_verified = true WHERE id = uid;
    RETURN 'verified';
  END IF;
  RETURN 'invalid';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Protection trigger checks session variable
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger AS $$
BEGIN
  -- Allow updates from redeem_code (session variable set)
  IF current_setting('app.allow_role_change', true) = 'true' THEN
    RETURN new;
  END IF;

  -- Allow admin users to do anything
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sv_admin') THEN
     RETURN new;
  END IF;

  -- Regular users: block role and is_verified self-escalation
  IF new.role IS DISTINCT FROM old.role THEN
     new.role := old.role;
  END IF;

  IF new.is_verified IS DISTINCT FROM old.is_verified THEN
     new.is_verified := old.is_verified;
  END IF;

  -- Everything else passes through fine
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_profile_protection
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_fields();

-- 6. RLS Policies (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
CREATE POLICY "Public profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Self update" ON public.profiles;
CREATE POLICY "Self update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Self insert" ON public.profiles;
CREATE POLICY "Self insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin update" ON public.profiles;
CREATE POLICY "Admin update" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sv_admin')
);

-- 7. Verify the migration worked
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;
