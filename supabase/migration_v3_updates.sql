-- ==========================================
-- FWG NACHHILFEBÖRSE V3 UPDATE MIGRATION
-- ==========================================

-- 1. PROMO CODES TABLE
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  effect_type text DEFAULT 'ad_boost' CHECK (effect_type IN ('ad_boost', 'badge', 'special_discount', 'custom')),
  boost_days integer DEFAULT 14,
  max_uses integer, -- NULL = unlimited
  current_uses integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS FOR PROMO CODES
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public check active promo codes" ON public.promo_codes;
CREATE POLICY "Public check active promo codes" ON public.promo_codes 
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "SV Admins manage promo codes" ON public.promo_codes;
CREATE POLICY "SV Admins manage promo codes" ON public.promo_codes 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sv_admin')
  );

-- Function to redeem/apply promo code atomically
CREATE OR REPLACE FUNCTION public.redeem_promo_code(code_val text)
RETURNS jsonb AS $$
DECLARE
  pc record;
BEGIN
  SELECT * INTO pc FROM public.promo_codes
  WHERE upper(code) = upper(code_val) 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF pc IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ungültiger oder abgelaufener Promo-Code.');
  END IF;

  -- Increment usage count
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE id = pc.id;

  RETURN jsonb_build_object(
    'success', true, 
    'code', pc.code,
    'effect_type', pc.effect_type,
    'boost_days', pc.boost_days
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. PAGE ANALYTICS TABLE
CREATE TABLE IF NOT EXISTS public.page_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  path text NOT NULL,
  device_type text DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  browser text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS FOR PAGE ANALYTICS
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone insert page analytics" ON public.page_analytics;
CREATE POLICY "Anyone insert page analytics" ON public.page_analytics 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "SV Admins select page analytics" ON public.page_analytics;
CREATE POLICY "SV Admins select page analytics" ON public.page_analytics 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sv_admin')
  );


-- 3. UNVERIFIED ACCOUNT AUTOMATIC CLEANUP (7 DAYS EXPIRATION)
CREATE OR REPLACE FUNCTION public.cleanup_unverified_users()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete unverified user profiles older than 7 days
  -- Note: If auth.users cascade delete is set up, removing profiles will cascade or can be triggered.
  WITH deleted_rows AS (
    DELETE FROM public.profiles
    WHERE is_verified = false
      AND (role IS NULL OR role != 'sv_admin')
      AND created_at < (now() - INTERVAL '7 days')
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted_rows;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. AUTOMATIC GRADE LEVEL ADVANCEMENT (AUGUST 1ST SCHULJAHRESWECHSEL)
CREATE OR REPLACE FUNCTION public.auto_advance_grade_levels()
RETURNS integer AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Advances 5->6, 6->7, 7->8, 8->9, 9->10, 10->EF, EF->Q1, Q2->Alumni
  UPDATE public.profiles
  SET grade_level = CASE
    WHEN grade_level = '5' THEN '6'
    WHEN grade_level = '6' THEN '7'
    WHEN grade_level = '7' THEN '8'
    WHEN grade_level = '8' THEN '9'
    WHEN grade_level = '9' THEN '10'
    WHEN grade_level = '10' THEN 'EF'
    WHEN grade_level = 'EF' THEN 'Q1'
    WHEN grade_level = 'Q1' THEN 'Q2'
    WHEN grade_level = 'Q2' THEN 'Ehemalige/r'
    ELSE grade_level
  END;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
