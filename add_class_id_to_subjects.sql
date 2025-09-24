-- Script pour ajouter la colonne class_id à la table subjects

-- Vérifier d'abord si la colonne existe déjà
DO $$
BEGIN
  -- Ajouter la colonne class_id si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'subjects' 
    AND column_name = 'class_id'
  ) THEN
    ALTER TABLE subjects ADD COLUMN class_id UUID;
  END IF;
END $$;

-- Vérifier si la colonne school_id existe, sinon l'ajouter
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'subjects' 
    AND column_name = 'school_id'
  ) THEN
    ALTER TABLE subjects ADD COLUMN school_id UUID;
  END IF;
END $$;

-- Vérifier si la colonne hours_per_week existe, sinon l'ajouter
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'subjects' 
    AND column_name = 'hours_per_week'
  ) THEN
    ALTER TABLE subjects ADD COLUMN hours_per_week INTEGER DEFAULT 0;
  END IF;
END $$;

-- Vérifier si la colonne abbreviation existe, sinon l'ajouter
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'subjects' 
    AND column_name = 'abbreviation'
  ) THEN
    ALTER TABLE subjects ADD COLUMN abbreviation TEXT;
  END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);

-- Mettre à jour les enregistrements existants avec des valeurs par défaut
UPDATE subjects 
SET class_id = '00000000-0000-0000-0000-000000000001' 
WHERE class_id IS NULL;

UPDATE subjects 
SET school_id = '00000000-0000-0000-0000-000000000001' 
WHERE school_id IS NULL;

-- Ajouter des contraintes NOT NULL si les colonnes ont des valeurs
DO $$
BEGIN
  -- Rendre class_id NOT NULL si toutes les valeurs sont non-null
  IF NOT EXISTS (
    SELECT 1 FROM subjects WHERE class_id IS NULL
  ) THEN
    ALTER TABLE subjects ALTER COLUMN class_id SET NOT NULL;
  END IF;
  
  -- Rendre school_id NOT NULL si toutes les valeurs sont non-null
  IF NOT EXISTS (
    SELECT 1 FROM subjects WHERE school_id IS NULL
  ) THEN
    ALTER TABLE subjects ALTER COLUMN school_id SET NOT NULL;
  END IF;
END $$;

-- Vérifier la structure finale de la table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;
