-- FIX: grade_level is NOT NULL but not provided during signup. Make it nullable.
ALTER TABLE public.profiles ALTER COLUMN grade_level DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN display_name DROP NOT NULL;

-- Reload PostgREST schema cache so the API picks up the changes
NOTIFY pgrst, 'reload schema';
