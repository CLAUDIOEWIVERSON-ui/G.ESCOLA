-- Migration 39: Add creator_id and is_exclusive to eventos for Administrative Agenda customization
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure public read access is enabled but users can insert their own events
-- Drop old policy if exists
DROP POLICY IF EXISTS "Public read access" ON public.eventos;
DROP POLICY IF EXISTS "Admins have full access" ON public.eventos;
DROP POLICY IF EXISTS "Users can manage their own events" ON public.eventos;

-- Create policies for eventos table:
-- 1. All authenticated users can read (select) events they have access to:
--    - Admins see non-exclusive (general) events and their own events.
--    - Ordinary users see non-exclusive (general) events and their own events (where creator_id matches their uid).
CREATE POLICY "Users can view relevant events" ON public.eventos
  FOR SELECT USING (
    NOT is_exclusive 
    OR creator_id = auth.uid() 
    OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  );

-- 2. All authenticated users can insert events
CREATE POLICY "Users can insert events" ON public.eventos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Users can update events they created, or admins can update any visible event
CREATE POLICY "Users can update their own events or admins can update all" ON public.eventos
  FOR UPDATE USING (
    creator_id = auth.uid() 
    OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  );

-- 4. Users can delete events they created, or admins can delete any visible event
CREATE POLICY "Users can delete their own events or admins can delete all" ON public.eventos
  FOR DELETE USING (
    creator_id = auth.uid() 
    OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  );
