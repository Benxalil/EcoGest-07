-- Créer la table student_documents
CREATE TABLE IF NOT EXISTS student_documents (
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

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_student_documents_student_id ON student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_file_type ON student_documents(file_type);

-- Activer RLS
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "Les utilisateurs peuvent voir les documents de leurs élèves" ON student_documents
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM students s 
      WHERE s.school_id IN (
        SELECT school_id FROM user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Les utilisateurs peuvent ajouter des documents à leurs élèves" ON student_documents
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s 
      WHERE s.school_id IN (
        SELECT school_id FROM user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Les utilisateurs peuvent modifier les documents de leurs élèves" ON student_documents
  FOR UPDATE USING (
    student_id IN (
      SELECT s.id FROM students s 
      WHERE s.school_id IN (
        SELECT school_id FROM user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Les utilisateurs peuvent supprimer les documents de leurs élèves" ON student_documents
  FOR DELETE USING (
    student_id IN (
      SELECT s.id FROM students s 
      WHERE s.school_id IN (
        SELECT school_id FROM user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- Créer le bucket de stockage pour les fichiers des élèves
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('student-files', 'student-files', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- Politique pour le bucket de stockage
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
