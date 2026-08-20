-- ============================================================
-- SECURITY & DSGVO MIGRATION
-- Run this in Supabase SQL Editor after reviewing each section.
-- Created: August 2026
-- ============================================================

-- 1. RLS Policy hardening - Replace overly permissive policies
-- Fix: Ads should only be readable by authenticated users (school-internal app)
DROP POLICY IF EXISTS "Public ads" ON public.ads;
CREATE POLICY "Authenticated ads" ON public.ads 
  FOR SELECT USING (auth.role() = 'authenticated');

-- Fix: Reviews should only be readable by authenticated users  
DROP POLICY IF EXISTS "Public reviews" ON public.reviews;
CREATE POLICY "Authenticated reviews" ON public.reviews 
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Server-side profanity filter trigger
-- Server-side profanity check for messages
CREATE OR REPLACE FUNCTION public.check_message_content()
RETURNS trigger AS $$
DECLARE
  lower_content text;
BEGIN
  lower_content := lower(NEW.content);
  
  IF lower_content ~* '(hurensohn|arschloch|bastard|bitch|fotze|wichser|missgeburt|schlampe|nigger|fick(en)?|slut|whore|cunt|dick|cock|pussy|asshole|motherfucker|spast(i)?)' THEN
    RAISE EXCEPTION 'Nachricht enthält unangemessene Inhalte und wurde blockiert.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_message_profanity ON public.messages;
CREATE TRIGGER check_message_profanity
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.check_message_content();

-- 3. Secure parent link codes
-- Add secure parent link code column if not exists
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS parent_link_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS parent_link_code_expires_at timestamptz;

-- Function to generate secure parent link code
CREATE OR REPLACE FUNCTION public.generate_parent_link_code()
RETURNS text AS $$
DECLARE
  new_code text;
BEGIN
  -- Generate 8-char hex code from random bytes
  new_code := upper(encode(gen_random_bytes(4), 'hex'));
  
  -- Store it on the user's profile with 7-day expiry
  UPDATE public.profiles 
  SET parent_link_code = new_code,
      parent_link_code_expires_at = now() + interval '7 days'
  WHERE id = auth.uid();
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Parental consent columns
-- Add parental consent tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parental_consent_given boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parental_consent_date timestamptz;

-- 5. Account deletion function
-- Self-service account deletion (soft delete with 30-day grace period)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS boolean AS $$
BEGIN
  -- Mark profile for deletion
  UPDATE public.profiles 
  SET deletion_requested_at = now()
  WHERE id = auth.uid();
  
  -- Deactivate all ads
  UPDATE public.ads 
  SET is_active = false 
  WHERE user_id = auth.uid();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS boolean AS $$
BEGIN
  UPDATE public.profiles 
  SET deletion_requested_at = null
  WHERE id = auth.uid();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
