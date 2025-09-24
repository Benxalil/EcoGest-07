-- Script pour créer la table subjects si elle n'existe pas
CREATE TABLE IF NOT EXISTS subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  hours_per_week INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);

-- Activer RLS (Row Level Security)
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Créer une politique RLS pour permettre l'accès aux données de l'école
CREATE POLICY "Users can view subjects from their school" ON subjects
  FOR SELECT USING (
    school_id IN (
      SELECT id FROM schools 
      WHERE id = auth.jwt() ->> 'school_id'
    )
  );

CREATE POLICY "Users can insert subjects for their school" ON subjects
  FOR INSERT WITH CHECK (
    school_id IN (
      SELECT id FROM schools 
      WHERE id = auth.jwt() ->> 'school_id'
    )
  );

CREATE POLICY "Users can update subjects from their school" ON subjects
  FOR UPDATE USING (
    school_id IN (
      SELECT id FROM schools 
      WHERE id = auth.jwt() ->> 'school_id'
    )
  );

CREATE POLICY "Users can delete subjects from their school" ON subjects
  FOR DELETE USING (
    school_id IN (
      SELECT id FROM schools 
      WHERE id = auth.jwt() ->> 'school_id'
    )
  );

-- Ajouter quelques matières d'exemple pour tester
INSERT INTO subjects (name, abbreviation, class_id, school_id, hours_per_week) VALUES
  ('Mathématiques', 'MATH', (SELECT id FROM classes LIMIT 1), (SELECT id FROM schools LIMIT 1), 5),
  ('Français', 'FR', (SELECT id FROM classes LIMIT 1), (SELECT id FROM schools LIMIT 1), 4),
  ('Sciences', 'SCI', (SELECT id FROM classes LIMIT 1), (SELECT id FROM schools LIMIT 1), 3),
  ('Histoire-Géographie', 'H-G', (SELECT id FROM classes LIMIT 1), (SELECT id FROM schools LIMIT 1), 2)
ON CONFLICT DO NOTHING;
