-- Run this in Supabase SQL Editor to debug the trigger:

-- 1. Show the ACTUAL trigger function source code
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- 2. Show all constraints on profiles table
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass;

-- 3. Show all columns & their defaults
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Try a manual insert to see the exact error
DO $$
BEGIN
  INSERT INTO public.profiles (id, full_name, display_name, email)
  VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Test User', 'Test User', 'test@test.de')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RAISE NOTICE 'Insert succeeded!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Insert FAILED: % - %', SQLERRM, SQLSTATE;
END;
$$;

-- 5. Clean up test row
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
