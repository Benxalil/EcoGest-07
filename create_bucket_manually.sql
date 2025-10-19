-- Script pour créer manuellement le bucket student-files dans Supabase
-- Exécutez ce script dans l'éditeur SQL de Supabase si le bucket n'existe pas

-- Vérifier si le bucket existe déjà
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'student-files';

-- Si le bucket n'existe pas, le créer
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'student-files', 
  'student-files', 
  false, 
  10485760, -- 10MB en bytes
  ARRAY[
    'image/jpeg', 
    'image/png', 
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Vérifier que le bucket a été créé
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'student-files';

-- Créer les politiques RLS pour le bucket
CREATE POLICY "Les utilisateurs peuvent voir les fichiers de leurs élèves" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'student-files' AND
    (storage.foldername(name))[2] IN (
      SELECT school_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent uploader des fichiers pour leurs élèves" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'student-files' AND
    (storage.foldername(name))[2] IN (
      SELECT school_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent modifier les fichiers de leurs élèves" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'student-files' AND
    (storage.foldername(name))[2] IN (
      SELECT school_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent supprimer les fichiers de leurs élèves" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'student-files' AND
    (storage.foldername(name))[2] IN (
      SELECT school_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );
