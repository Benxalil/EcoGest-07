-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Public access to school logos" ON storage.objects;
DROP POLICY IF EXISTS "School admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "School admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "School admins can delete logos" ON storage.objects;

-- Créer un bucket public pour les logos d'école
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-logos',
  'school-logos',
  true,
  2097152, -- 2MB max
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- Politiques RLS pour le bucket school-logos
CREATE POLICY "Public read access to school logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'school-logos');

CREATE POLICY "Admins can upload school logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'school-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'school_admin'
  )
);

CREATE POLICY "Admins can update school logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'school-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'school_admin'
  )
);

CREATE POLICY "Admins can delete school logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'school-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'school_admin'
  )
);