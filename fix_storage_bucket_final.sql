-- Script final pour corriger le bucket de stockage
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- 1. Supprimer le bucket s'il existe déjà
DELETE FROM storage.buckets WHERE id = 'student-files';

-- 2. Créer le bucket student-files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'student-files', 
  'student-files', 
  false, 
  10485760, -- 10MB en bytes
  ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'text/plain'
  ]
);

-- 3. Supprimer les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "storage_objects_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_delete_policy" ON storage.objects;

-- 4. Créer des politiques RLS simples pour le stockage
CREATE POLICY "storage_objects_select_policy" ON storage.objects
  FOR SELECT USING (true);

CREATE POLICY "storage_objects_insert_policy" ON storage.objects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "storage_objects_update_policy" ON storage.objects
  FOR UPDATE USING (true);

CREATE POLICY "storage_objects_delete_policy" ON storage.objects
  FOR DELETE USING (true);

-- 5. Vérifier que le bucket a été créé
SELECT 'Bucket student-files créé avec succès' as status;
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'student-files';

-- 6. Vérifier les politiques
SELECT 'Politiques de stockage créées' as status;
SELECT policyname FROM pg_policies WHERE tablename = 'objects';
