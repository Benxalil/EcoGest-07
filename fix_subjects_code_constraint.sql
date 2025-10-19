-- Script pour corriger la contrainte NOT NULL sur la colonne code

-- D'abord, vérifier la structure actuelle de la table subjects
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;

-- Modifier la colonne code pour permettre les valeurs NULL temporairement
ALTER TABLE subjects ALTER COLUMN code DROP NOT NULL;

-- Ou si la colonne n'existe pas, l'ajouter
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'subjects' 
    AND column_name = 'code'
  ) THEN
    ALTER TABLE subjects ADD COLUMN code TEXT;
  END IF;
END $$;

-- Mettre à jour les enregistrements existants avec des valeurs par défaut pour code
UPDATE subjects 
SET code = abbreviation 
WHERE code IS NULL AND abbreviation IS NOT NULL;

UPDATE subjects 
SET code = UPPER(LEFT(name, 3)) 
WHERE code IS NULL;

-- Maintenant, rendre la colonne code NOT NULL si toutes les valeurs sont remplies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM subjects WHERE code IS NULL
  ) THEN
    ALTER TABLE subjects ALTER COLUMN code SET NOT NULL;
  END IF;
END $$;

-- Vérifier les données mises à jour
SELECT id, name, code, abbreviation, class_id, school_id 
FROM subjects 
ORDER BY name;
