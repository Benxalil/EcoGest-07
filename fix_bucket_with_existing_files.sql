-- Script pour gérer le bucket existant avec des fichiers
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- 1. Vérifier l'état actuel du bucket
SELECT 'État actuel du bucket student-files:' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at 
FROM storage.buckets 
WHERE id = 'student-files';

-- 2. Vérifier les fichiers dans le bucket
SELECT 'Fichiers dans le bucket student-files:' as info;
SELECT name, bucket_id, size, created_at 
FROM storage.objects 
WHERE bucket_id = 'student-files' 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Mettre à jour la configuration du bucket (sans le supprimer)
UPDATE storage.buckets 
SET 
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'text/plain'
  ]
WHERE id = 'student-files';

-- 4. Supprimer les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "storage_objects_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_delete_policy" ON storage.objects;

-- 5. Créer des politiques RLS simples pour le stockage
CREATE POLICY "storage_objects_select_policy" ON storage.objects
  FOR SELECT USING (true);

CREATE POLICY "storage_objects_insert_policy" ON storage.objects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "storage_objects_update_policy" ON storage.objects
  FOR UPDATE USING (true);

CREATE POLICY "storage_objects_delete_policy" ON storage.objects
  FOR DELETE USING (true);

-- 6. Vérifier la configuration finale
SELECT 'Configuration finale du bucket:' as status;
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'student-files';

-- 7. Vérifier les politiques
SELECT 'Politiques de stockage:' as status;
SELECT policyname FROM pg_policies WHERE tablename = 'objects';

-- 8. Tester l'accès au bucket
SELECT 'Test d\'accès au bucket:' as status;
SELECT COUNT(*) as nombre_fichiers FROM storage.objects WHERE bucket_id = 'student-files';
