-- Créer des politiques RLS pour permettre l'affichage public des logos d'école
-- Les logos sont dans le dossier school-logos/ du bucket student-documents

-- Politique pour permettre la lecture publique des logos d'école
CREATE POLICY "Public access to school logos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'student-documents' 
  AND (storage.foldername(name))[1] = 'school-logos'
);

-- Politique pour permettre aux admins d'uploader des logos
CREATE POLICY "School admins can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'student-documents' 
  AND (storage.foldername(name))[1] = 'school-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'school_admin'
  )
);

-- Politique pour permettre aux admins de mettre à jour des logos
CREATE POLICY "School admins can update logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'student-documents' 
  AND (storage.foldername(name))[1] = 'school-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'school_admin'
  )
);

-- Politique pour permettre aux admins de supprimer des logos
CREATE POLICY "School admins can delete logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'student-documents' 
  AND (storage.foldername(name))[1] = 'school-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'school_admin'
  )
);