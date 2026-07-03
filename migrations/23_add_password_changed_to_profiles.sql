-- Migration 23: Add has_changed_password to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_changed_password BOOLEAN DEFAULT false;
