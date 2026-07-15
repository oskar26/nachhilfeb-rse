-- ==========================================
-- FWG NACHHILFEBÖRSE V2 UPDATE MIGRATION
-- ==========================================

-- 1. PROFILES SCHEMA ALTERATIONS
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'sv_admin', 'parent'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date date;

-- 2. INVITE CODES TABLE
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_at timestamp with time zone,
  expires_at timestamp with time zone,
  role text DEFAULT 'student' CHECK (role IN ('student', 'sv_admin', 'parent')),
  is_used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PARENT LINKS & CONSENTS
CREATE TABLE IF NOT EXISTS public.parent_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  child_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  permissions jsonb DEFAULT '{"can_view_ads": true, "can_view_ratings": true, "can_view_activity": true, "can_receive_notifications": true}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  linked_at timestamp with time zone,
  UNIQUE(parent_id, child_id)
);

CREATE TABLE IF NOT EXISTS public.parental_consents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  child_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  consent_type text NOT NULL, -- e.g., 'profile_visibility', 'chat_usage', 'general'
  is_granted boolean DEFAULT false,
  granted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  ip_address text,
  user_agent text
);

-- 4. ENHANCED REPORTS
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS category text DEFAULT 'anzeige' CHECK (category IN ('profil', 'anzeige', 'chat', 'datenschutz', 'sonstiges'));
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS sub_reason text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('normal', 'hoch', 'kritisch'));
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS evidence text[] DEFAULT '{}';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS related_message_ids uuid[] DEFAULT '{}';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolution_type text CHECK (resolution_type IN ('warn', 'ban', 'delete', 'dismiss', 'escalate'));
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reporter_notified boolean DEFAULT false;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS admin_notes text;

-- CHECK CONSTRAINT for reports to ensure at least one target is present
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_targets_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_targets_check CHECK (reported_ad_id IS NOT NULL OR reported_user_id IS NOT NULL);

-- 5. REPORT CHAT ACCESS
CREATE TABLE IF NOT EXISTS public.report_chat_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  chat_user_ids uuid[] NOT NULL, -- Array of the two participants in the chat
  granted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone NOT NULL
);

-- 6. ADMIN AUDIT LOG
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL, -- e.g. 'ban_user', 'delete_ad', 'resolve_report', 'verify_user'
  target_type text NOT NULL, -- e.g. 'profile', 'ad', 'report', 'code'
  target_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. USER BANS
CREATE TABLE IF NOT EXISTS public.user_bans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  banned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  ban_type text DEFAULT 'temporary' CHECK (ban_type IN ('temporary', 'permanent')),
  expires_at timestamp with time zone, -- NULL for permanent
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. FAVORITE COLLECTIONS & FAVORITES ADJUSTMENT
CREATE TABLE IF NOT EXISTS public.favorite_collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#FACC15',
  icon text DEFAULT 'Folder',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.favorites ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.favorite_collections(id) ON DELETE SET NULL;

-- 9. AUTO MATCHING SYSTEM
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  seeker_ad_id uuid REFERENCES public.ads(id) ON DELETE CASCADE NOT NULL,
  provider_ad_id uuid REFERENCES public.ads(id) ON DELETE CASCADE NOT NULL,
  match_score float DEFAULT 0 NOT NULL,
  match_reasons jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'contacted', 'dismissed')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(seeker_ad_id, provider_ad_id)
);

-- 10. PUSH NOTIFICATIONS & IN-APP NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint text UNIQUE NOT NULL,
  keys jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_active timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- e.g., 'new_message', 'request_update', 'new_match', 'report_update', 'system'
  title text NOT NULL,
  message text,
  data jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. ADS BOOSTED (BANANE EASTEREGG)
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS boosted boolean DEFAULT false NOT NULL;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS boosted_until timestamp with time zone;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS promo_code_used text;

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on new tables
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parental_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_chat_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 12. INVITE CODES RLS (FIXING SECURITY HOLE)
-- Only SV Admins can see all invite codes.
DROP POLICY IF EXISTS "Admins manage invite codes" ON public.invite_codes;
CREATE POLICY "Admins manage invite codes" ON public.invite_codes FOR ALL USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

-- Users can select a code ONLY if they supply its exact code value (for registration/redeem check)
DROP POLICY IF EXISTS "Public check invite codes" ON public.invite_codes;
CREATE POLICY "Public check invite codes" ON public.invite_codes FOR SELECT USING (
  code IS NOT NULL
);

-- 13. PARENT LINKS RLS
DROP POLICY IF EXISTS "Users view own parent links" ON public.parent_links;
CREATE POLICY "Users view own parent links" ON public.parent_links FOR SELECT USING (
  auth.uid() = parent_id OR auth.uid() = child_id
);

DROP POLICY IF EXISTS "Parents manage parent links" ON public.parent_links;
CREATE POLICY "Parents manage parent links" ON public.parent_links FOR ALL USING (
  auth.uid() = parent_id OR auth.uid() = child_id
);

-- 14. PARENTAL CONSENTS RLS
DROP POLICY IF EXISTS "Parents view consents" ON public.parental_consents;
CREATE POLICY "Parents view consents" ON public.parental_consents FOR SELECT USING (
  auth.uid() = parent_id OR auth.uid() = child_id
);

DROP POLICY IF EXISTS "Parents write consents" ON public.parental_consents;
CREATE POLICY "Parents write consents" ON public.parental_consents FOR INSERT WITH CHECK (
  auth.uid() = parent_id
);

-- 15. REPORT CHAT ACCESS RLS (Admin chat override protection)
DROP POLICY IF EXISTS "Admins view chat access" ON public.report_chat_access;
CREATE POLICY "Admins view chat access" ON public.report_chat_access FOR SELECT USING (
  auth.uid() = admin_id AND exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

DROP POLICY IF EXISTS "Admins insert chat access" ON public.report_chat_access;
CREATE POLICY "Admins insert chat access" ON public.report_chat_access FOR INSERT WITH CHECK (
  auth.uid() = admin_id AND exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

-- 16. ADMIN AUDIT LOG RLS
DROP POLICY IF EXISTS "Admins view audit log" ON public.admin_audit_log;
CREATE POLICY "Admins view audit log" ON public.admin_audit_log FOR SELECT USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

DROP POLICY IF EXISTS "Admins insert audit log" ON public.admin_audit_log;
CREATE POLICY "Admins insert audit log" ON public.admin_audit_log FOR INSERT WITH CHECK (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

-- 17. USER BANS RLS
DROP POLICY IF EXISTS "Public view bans" ON public.user_bans;
CREATE POLICY "Public view bans" ON public.user_bans FOR SELECT USING (
  auth.uid() = user_id OR exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

DROP POLICY IF EXISTS "Admins manage bans" ON public.user_bans;
CREATE POLICY "Admins manage bans" ON public.user_bans FOR ALL USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

-- 18. FAVORITE COLLECTIONS RLS
DROP POLICY IF EXISTS "Own collections" ON public.favorite_collections;
CREATE POLICY "Own collections" ON public.favorite_collections FOR ALL USING (
  auth.uid() = user_id
);

-- 19. MATCHES RLS
DROP POLICY IF EXISTS "View own matches" ON public.matches;
CREATE POLICY "View own matches" ON public.matches FOR SELECT USING (
  exists (
    select 1 from public.ads a
    where (a.id = seeker_ad_id or a.id = provider_ad_id)
    and a.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins view matches" ON public.matches;
CREATE POLICY "Admins view matches" ON public.matches FOR SELECT USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

-- 20. PUSH SUBSCRIPTIONS RLS
DROP POLICY IF EXISTS "Own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Own push subscriptions" ON public.push_subscriptions FOR ALL USING (
  auth.uid() = user_id
);

-- 21. NOTIFICATIONS RLS
DROP POLICY IF EXISTS "Own notifications" ON public.notifications;
CREATE POLICY "Own notifications" ON public.notifications FOR ALL USING (
  auth.uid() = user_id
);

-- 22. MESSAGES RLS FOR SV ADMIN (RESTRICTED CHAT READING)
-- Drop old admin view policy if any
DROP POLICY IF EXISTS "SV Admin can view all messages" ON public.messages;

-- Create new restricted admin view policy: admins can read messages ONLY if there is an active report chat access grant
CREATE POLICY "Restricted admin view messages" ON public.messages FOR SELECT USING (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'sv_admin'
  ) AND (
    exists (
      select 1 from public.report_chat_access rca
      where rca.admin_id = auth.uid()
      and sender_id = any(rca.chat_user_ids)
      and rca.expires_at > now()
    )
  )
);

-- ==========================================
-- DATABASE FUNCTIONS / TRIGGERS FOR v2
-- ==========================================

-- Function to redeem invite code on signup
CREATE OR REPLACE FUNCTION public.redeem_invite_code(code_val text, target_user_id uuid)
RETURNS text AS $$
DECLARE
  code_record record;
BEGIN
  -- Check if code exists, is unused and not expired
  SELECT * INTO code_record FROM public.invite_codes
  WHERE code = code_val AND is_used = false AND (expires_at IS NULL OR expires_at > now());

  IF code_record IS NULL THEN
    RETURN 'invalid';
  END IF;

  -- Temporarily bypass profile protection triggers
  PERFORM set_config('app.allow_role_change', 'true', true);
  PERFORM set_config('app.bypass_rls', 'true', true);

  -- Update profile
  UPDATE public.profiles
  SET is_verified = true, role = code_record.role, sv_code_used = code_val
  WHERE id = target_user_id;

  -- Mark code as used
  UPDATE public.invite_codes
  SET is_used = true, used_by = target_user_id, used_at = now()
  WHERE id = code_record.id;

  RETURN code_record.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban/unban user and toggle is_banned in profile
CREATE OR REPLACE FUNCTION public.apply_user_ban()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET is_banned = true WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- If ban record is deleted, unban if no other active ban exists
    IF NOT EXISTS (SELECT 1 FROM public.user_bans WHERE user_id = OLD.user_id AND (expires_at IS NULL OR expires_at > now())) THEN
      UPDATE public.profiles SET is_banned = false WHERE id = OLD.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_ban_changed
  AFTER INSERT OR DELETE ON public.user_bans
  FOR EACH ROW EXECUTE PROCEDURE public.apply_user_ban();

-- Function for matching algorithm calculate_matches
CREATE OR REPLACE FUNCTION public.calculate_matches(target_ad_id uuid)
RETURNS void AS $$
DECLARE
  target_ad record;
  match_ad record;
  subj text;
  grades_match boolean;
  subj_match boolean;
  loc_match boolean;
  score float;
  reasons jsonb;
BEGIN
  SELECT * INTO target_ad FROM public.ads WHERE id = target_ad_id;
  IF target_ad IS NULL THEN
    RETURN;
  END IF;

  -- Find compatible ads
  FOR match_ad IN 
    SELECT * FROM public.ads 
    WHERE id != target_ad_id 
    AND type != target_ad.type 
    AND is_active = true 
    AND is_hidden = false
  LOOP
    -- 1. Subject match
    subj_match := false;
    FOREACH subj IN ARRAY target_ad.subjects
    LOOP
      IF subj = ANY(match_ad.subjects) THEN
        subj_match := true;
      END IF;
    END LOOP;

    -- 2. Grades match (checking overlap)
    grades_match := false;
    IF target_ad.grade_levels && match_ad.grade_levels THEN
      grades_match := true;
    END IF;

    -- 3. Location match
    loc_match := false;
    IF target_ad.locations && match_ad.locations THEN
      loc_match := true;
    ELSIF target_ad.custom_location IS NOT NULL AND match_ad.custom_location IS NOT NULL AND lower(target_ad.custom_location) = lower(match_ad.custom_location) THEN
      loc_match := true;
    END IF;

    IF subj_match AND grades_match THEN
      -- Calculate Match Score
      score := 50.0; -- Base score since subjects and grades match
      IF loc_match THEN
        score := score + 20.0;
      END IF;
      
      -- Price check (heuristic)
      -- Let's say if both are within reasonable ranges
      score := score + 20.0; -- default price compat for school context

      reasons := jsonb_build_object(
        'subjects_match', subj_match,
        'grades_overlap', grades_match,
        'location_match', loc_match
      );

      -- Insert match
      IF target_ad.type = 'search' THEN
        INSERT INTO public.matches (seeker_ad_id, provider_ad_id, match_score, match_reasons)
        VALUES (target_ad.id, match_ad.id, score, reasons)
        ON CONFLICT (seeker_ad_id, provider_ad_id) DO UPDATE
        SET match_score = score, match_reasons = reasons;
      ELSE
        INSERT INTO public.matches (seeker_ad_id, provider_ad_id, match_score, match_reasons)
        VALUES (match_ad.id, target_ad.id, score, reasons)
        ON CONFLICT (seeker_ad_id, provider_ad_id) DO UPDATE
        SET match_score = score, match_reasons = reasons;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to calculate matches after an ad is created or updated
CREATE OR REPLACE FUNCTION public.trigger_calculate_matches()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_active = true AND NEW.is_hidden = false THEN
    PERFORM public.calculate_matches(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_ad_created_or_updated
  AFTER INSERT OR UPDATE OF subjects, grade_levels, locations, is_active, is_hidden ON public.ads
  FOR EACH ROW EXECUTE PROCEDURE public.trigger_calculate_matches();

-- 15. UPDATE handle_new_user TO RESPECT METADATA ROLE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  raw_name text;
  derived_name text;
  raw_role text;
BEGIN
  raw_name := new.raw_user_meta_data->>'full_name';
  IF raw_name IS NULL OR raw_name = '' THEN
    derived_name := split_part(new.email, '@', 1);
  ELSE
    derived_name := raw_name;
  END IF;

  raw_role := new.raw_user_meta_data->>'role';
  IF raw_role IS NULL OR raw_role = '' OR raw_role NOT IN ('student', 'parent', 'sv_admin') THEN
    raw_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, full_name, display_name, email, role)
  VALUES (new.id, derived_name, derived_name, new.email, raw_role)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. ANNOUNCEMENTS / NEWS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  icon text DEFAULT '📢',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sv_admin')
);
