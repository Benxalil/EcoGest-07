-- Script final pour corriger la table student_documents
-- Gère les politiques existantes et les recrée proprement

-- 1. Supprimer toutes les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "student_documents_select_policy" ON student_documents;
DROP POLICY IF EXISTS "student_documents_insert_policy" ON student_documents;
DROP POLICY IF EXISTS "student_documents_update_policy" ON student_documents;
DROP POLICY IF EXISTS "student_documents_delete_policy" ON student_documents;

DROP POLICY IF EXISTS "storage_objects_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_delete_policy" ON storage.objects;

-- 2. Supprimer la table student_documents si elle existe
DROP TABLE IF EXISTS student_documents CASCADE;

-- 3. Créer la table student_documents avec toutes les colonnes nécessaires
CREATE TABLE student_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'document')),
  file_size BIGINT NOT NULL,
  document_name TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Créer les index
CREATE INDEX IF NOT EXISTS idx_student_documents_student_id ON student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_file_type ON student_documents(file_type);
CREATE INDEX IF NOT EXISTS idx_student_documents_school_id ON student_documents(school_id);

-- 5. Activer RLS
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;

-- 6. Créer les politiques RLS pour student_documents
CREATE POLICY "student_documents_select_policy" ON student_documents
  FOR SELECT USING (true);

CREATE POLICY "student_documents_insert_policy" ON student_documents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "student_documents_update_policy" ON student_documents
  FOR UPDATE USING (true);

CREATE POLICY "student_documents_delete_policy" ON student_documents
  FOR DELETE USING (true);

-- 7. Créer le bucket de stockage s'il n'existe pas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('student-files', 'student-files', false)
ON CONFLICT (id) DO NOTHING;

-- 8. Créer les politiques pour le stockage
CREATE POLICY "storage_objects_select_policy" ON storage.objects
  FOR SELECT USING (true);

CREATE POLICY "storage_objects_insert_policy" ON storage.objects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "storage_objects_update_policy" ON storage.objects
  FOR UPDATE USING (true);

CREATE POLICY "storage_objects_delete_policy" ON storage.objects
  FOR DELETE USING (true);

-- 9. Vérifier que tout a été créé
SELECT 'Table student_documents créée avec succès' as status;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'student_documents';
SELECT 'Bucket student-files:' as info, COUNT(*) as count FROM storage.buckets WHERE id = 'student-files';
