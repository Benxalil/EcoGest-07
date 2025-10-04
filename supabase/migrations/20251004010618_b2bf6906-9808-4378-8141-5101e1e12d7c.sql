-- Correction des politiques RLS pour l'upload de photos d'élèves

-- 1. Supprimer les anciennes politiques restrictives sur student_documents
DROP POLICY IF EXISTS "School admins can manage student documents" ON student_documents;
DROP POLICY IF EXISTS "Users can view student documents from their school" ON student_documents;

-- 2. Créer des politiques plus permissives pour student_documents
-- Permettre à tous les utilisateurs authentifiés de leur école d'insérer des documents
CREATE POLICY "Users can insert student documents for their school"
ON student_documents
FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Permettre la lecture des documents de leur école
CREATE POLICY "Users can view student documents from their school"
ON student_documents
FOR SELECT
USING (
  school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Permettre la mise à jour des documents de leur école
CREATE POLICY "Users can update student documents from their school"
ON student_documents
FOR UPDATE
USING (
  school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Permettre la suppression des documents de leur école
CREATE POLICY "Users can delete student documents from their school"
ON student_documents
FOR DELETE
USING (
  school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 3. Supprimer les anciennes politiques restrictives sur storage.objects
DROP POLICY IF EXISTS "storage_objects_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_delete_policy" ON storage.objects;

-- 4. Créer des politiques permissives pour le bucket student-files
-- Permettre la lecture des fichiers du bucket student-files
CREATE POLICY "Users can view files in student-files bucket"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'student-files' AND
  auth.uid() IS NOT NULL
);

-- Permettre l'upload de fichiers dans le bucket student-files
CREATE POLICY "Users can upload files to student-files bucket"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'student-files' AND
  auth.uid() IS NOT NULL
);

-- Permettre la mise à jour des fichiers dans le bucket student-files
CREATE POLICY "Users can update files in student-files bucket"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'student-files' AND
  auth.uid() IS NOT NULL
);

-- Permettre la suppression des fichiers dans le bucket student-files
CREATE POLICY "Users can delete files from student-files bucket"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'student-files' AND
  auth.uid() IS NOT NULL
);

-- 5. Vérifier que le bucket student-files existe et est correctement configuré
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-files',
  'student-files',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];