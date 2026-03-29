-- ============================================================
-- DrinkingBuddy - Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor
-- Project: https://supabase.com/dashboard/project/<your-project>/sql
-- ============================================================

-- -------------------------------------------------------
-- 1. PROFILES
-- Extends auth.users with app-specific user data
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE,
  full_name     TEXT,
  avatar_url    TEXT,
  weight_kg     NUMERIC(5,1),
  gender        TEXT CHECK (gender IN ('male', 'female', 'other')),
  daily_limit   NUMERIC(4,1) NOT NULL DEFAULT 4,
  weekly_limit  NUMERIC(4,1) NOT NULL DEFAULT 14,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 2. DRINK LOGS
-- Every individual drink a user logs
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drink_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  drink_name       TEXT NOT NULL,
  drink_type       TEXT NOT NULL CHECK (drink_type IN ('beer','wine','spirit','cocktail','cider','champagne','other')),
  volume_ml        NUMERIC(6,1) NOT NULL,
  abv_percent      NUMERIC(5,2) NOT NULL,
  standard_drinks  NUMERIC(5,2) NOT NULL,
  logged_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 3. DRINK PRESETS
-- User-saved favourite drink configurations
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drink_presets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  drink_type       TEXT NOT NULL,
  volume_ml        NUMERIC(6,1) NOT NULL,
  abv_percent      NUMERIC(5,2) NOT NULL,
  standard_drinks  NUMERIC(5,2) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- Users can only read/write their own data
-- -------------------------------------------------------
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_presets ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Drink logs
CREATE POLICY "Users can view their own drink logs"
  ON public.drink_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drink logs"
  ON public.drink_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drink logs"
  ON public.drink_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drink logs"
  ON public.drink_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Drink presets
CREATE POLICY "Users can manage their own presets"
  ON public.drink_presets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 5. TRIGGER: auto-update updated_at on profiles
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -------------------------------------------------------
-- 6. TRIGGER: auto-create profile when user signs up
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, split_part(NEW.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------
-- 7. PERFORMANCE INDEXES
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_drink_logs_user_logged_at
  ON public.drink_logs (user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_drink_presets_user
  ON public.drink_presets (user_id);

-- ============================================================
-- Done! Your DrinkingBuddy database is ready.
-- ============================================================
