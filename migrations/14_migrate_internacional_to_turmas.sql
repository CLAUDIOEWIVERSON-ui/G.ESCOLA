-- Migration to move internacional and localizacao from cursos to turmas
-- and ensure the 'escola' storage bucket exists

-- 1. Update turmas table
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS internacional BOOLEAN DEFAULT FALSE;
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS localizacao TEXT;

-- 2. Optional: We keep the columns in cursos for now to avoid breaking existing data, 
-- but the application logic will shift to turmas.

-- 3. Storage Bucket Setup (if permissions allow)
-- This attempts to create the bucket 'escola' if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('escola', 'escola', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies for 'escola' bucket
-- Allow public read
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'escola');

-- Allow authenticated uploads
CREATE POLICY "Authenticated Uploads" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'escola' AND auth.role() = 'authenticated');

-- Allow authenticated deletes/updates
CREATE POLICY "Authenticated Updates" ON storage.objects FOR UPDATE 
USING (bucket_id = 'escola' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Deletes" ON storage.objects FOR DELETE 
USING (bucket_id = 'escola' AND auth.role() = 'authenticated');
