-- Migration 34: Create Certificate/Diploma Management, Templates and Signatures Tables
-- 1. Create table for templates
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('certificado', 'diploma')) NOT NULL DEFAULT 'certificado',
  background_frente_url TEXT,
  background_verso_url TEXT,
  campos_frente JSONB DEFAULT '[]'::jsonb,
  campos_verso JSONB DEFAULT '[]'::jsonb,
  qrcode_config JSONB DEFAULT '{"enabled": true, "x": 80, "y": 80, "size": 100}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS for templates
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to certificate templates" ON public.certificate_templates;
CREATE POLICY "Allow public read access to certificate templates" ON public.certificate_templates FOR SELECT USING (deleted_at IS NULL);
DROP POLICY IF EXISTS "Allow authenticated write access to certificate templates" ON public.certificate_templates;
CREATE POLICY "Allow authenticated write access to certificate templates" ON public.certificate_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Create table for digital signatures
CREATE TABLE IF NOT EXISTS public.certificate_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_autoridade TEXT NOT NULL,
  cargo TEXT NOT NULL,
  assinatura_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS for signatures
ALTER TABLE public.certificate_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to signatures" ON public.certificate_signatures;
CREATE POLICY "Allow public read access to signatures" ON public.certificate_signatures FOR SELECT USING (deleted_at IS NULL);
DROP POLICY IF EXISTS "Allow authenticated write access to signatures" ON public.certificate_signatures;
CREATE POLICY "Allow authenticated write access to signatures" ON public.certificate_signatures FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Enhance standard certificados table dynamically
ALTER TABLE public.certificados ADD COLUMN IF NOT EXISTS codigo_validacao TEXT UNIQUE;
ALTER TABLE public.certificados ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.certificate_templates(id);
ALTER TABLE public.certificados ADD COLUMN IF NOT EXISTS valores_mapeados JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.certificados ADD COLUMN IF NOT EXISTS emitido_por UUID REFERENCES auth.users(id);
ALTER TABLE public.certificados ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'valido';

-- Enable RLS for certificates
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select/read access to certificates" ON public.certificados;
CREATE POLICY "Public select/read access to certificates" ON public.certificados FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated write/modify to certificates" ON public.certificados;
CREATE POLICY "Authenticated write/modify to certificates" ON public.certificados FOR ALL TO authenticated USING (true) WITH CHECK (true);
