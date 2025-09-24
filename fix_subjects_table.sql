-- Script corrigé pour créer la table subjects
-- D'abord, vérifions la structure de la table classes
-- Puis créons la table subjects avec les bonnes références

-- Créer la table subjects avec les colonnes correctes
CREATE TABLE IF NOT EXISTS subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT,
  class_id UUID NOT NULL,
  school_id UUID NOT NULL,
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

-- Ajouter des contraintes de clé étrangère si les tables existent
-- Vérifier d'abord si la table classes existe et a une colonne id
DO $$
BEGIN
  -- Ajouter la contrainte de clé étrangère pour class_id si possible
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'classes') THEN
    BEGIN
      ALTER TABLE subjects ADD CONSTRAINT fk_subjects_class_id 
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN OTHERS THEN
        -- Si la contrainte ne peut pas être ajoutée, continuer sans
        NULL;
    END;
  END IF;
END $$;

-- Ajouter la contrainte de clé étrangère pour school_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schools') THEN
    BEGIN
      ALTER TABLE subjects ADD CONSTRAINT fk_subjects_school_id 
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN OTHERS THEN
        -- Si la contrainte ne peut pas être ajoutée, continuer sans
        NULL;
    END;
  END IF;
END $$;

-- Insérer quelques matières d'exemple pour tester
-- Utiliser des UUIDs valides pour les tests
INSERT INTO subjects (name, abbreviation, class_id, school_id, hours_per_week) VALUES
  ('Mathématiques', 'MATH', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 5),
  ('Français', 'FR', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 4),
  ('Sciences', 'SCI', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 3),
  ('Histoire-Géographie', 'H-G', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 2)
ON CONFLICT DO NOTHING;
