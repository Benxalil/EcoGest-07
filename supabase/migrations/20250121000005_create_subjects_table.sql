-- Créer la table subjects pour les matières
CREATE TABLE IF NOT EXISTS subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abbreviation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name);

-- Activer RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Créer des politiques RLS simples
CREATE POLICY "subjects_select_policy" ON subjects
  FOR SELECT USING (true);

CREATE POLICY "subjects_insert_policy" ON subjects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "subjects_update_policy" ON subjects
  FOR UPDATE USING (true);

CREATE POLICY "subjects_delete_policy" ON subjects
  FOR DELETE USING (true);


