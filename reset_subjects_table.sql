-- Script pour réinitialiser complètement la table subjects
-- ATTENTION: Ce script supprime TOUTES les données existantes

-- 1. Supprimer toutes les données
DELETE FROM subjects;

-- 2. Supprimer toutes les contraintes
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'subjects'
        AND tc.constraint_type = 'UNIQUE'
    LOOP
        EXECUTE 'ALTER TABLE subjects DROP CONSTRAINT ' || constraint_name;
    END LOOP;
END $$;

-- 3. Rendre la colonne code nullable
ALTER TABLE subjects ALTER COLUMN code DROP NOT NULL;

-- 4. Ajouter uniquement la contrainte correcte
ALTER TABLE subjects ADD CONSTRAINT subjects_unique_per_class 
UNIQUE (name, class_id);

-- 5. Vérifier la structure finale
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;

-- 6. Vérifier les contraintes
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'subjects'
ORDER BY tc.constraint_name;
