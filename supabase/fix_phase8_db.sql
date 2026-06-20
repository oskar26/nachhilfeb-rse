-- 1. Fix existing profiles that have NULL names (so they show up in Admin)
UPDATE public.profiles
SET 
  first_name = split_part(email, '@', 1),
  last_name = 'Nutzer',
  display_name = split_part(email, '@', 1)
WHERE first_name IS NULL OR display_name IS NULL;

-- 2. Improved redeem_code function
-- Make sure the session variable actually works by using 'app.allow_role_change'
DROP FUNCTION IF EXISTS public.redeem_code(text);
CREATE OR REPLACE FUNCTION public.redeem_code(secret_code text)
RETURNS text AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN 'invalid';
  END IF;

  -- Set session variable for the current transaction
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

-- 3. Ensure RLS policies don't block the update even for the user themselves
-- (The trigger would normally block it, but session variable bypasses that)
-- The existing policies are fine.

-- 4. Fix Reports Foreign Key risk: 
-- Make sure all users in auth.users HAVE a profile entry.
INSERT INTO public.profiles (id, email, first_name, last_name, display_name)
SELECT 
  id, 
  email, 
  split_part(email, '@', 1), 
  'Nutzer', 
  split_part(email, '@', 1)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 5. Reload Cache
NOTIFY pgrst, 'reload schema';
