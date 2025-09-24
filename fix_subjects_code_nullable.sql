-- Script pour rendre la colonne code nullable dans la table subjects
-- Cela permettra de créer des matières sans code obligatoire

-- 1. Rendre la colonne code nullable
ALTER TABLE subjects ALTER COLUMN code DROP NOT NULL;

-- 2. Mettre à jour les enregistrements existants qui ont code = null
UPDATE subjects 
SET code = COALESCE(abbreviation, UPPER(LEFT(name, 3)))
WHERE code IS NULL;

-- 3. Vérifier la structure de la table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;
