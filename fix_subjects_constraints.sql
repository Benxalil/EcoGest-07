-- Script pour corriger les contraintes de la table subjects

-- 1. Supprimer les contraintes problématiques si elles existent
DO $$ 
BEGIN
    -- Supprimer la contrainte unique sur (name, class_id) si elle existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_name_class_id_key'
    ) THEN
        ALTER TABLE subjects DROP CONSTRAINT subjects_name_class_id_key;
    END IF;

    -- Supprimer la contrainte unique sur (abbreviation, class_id) si elle existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_abbreviation_class_id_key'
    ) THEN
        ALTER TABLE subjects DROP CONSTRAINT subjects_abbreviation_class_id_key;
    END IF;

    -- Supprimer la contrainte unique sur (code, class_id) si elle existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_code_class_id_key'
    ) THEN
        ALTER TABLE subjects DROP CONSTRAINT subjects_code_class_id_key;
    END IF;
END $$;

-- 2. Rendre la colonne code nullable si elle ne l'est pas
ALTER TABLE subjects ALTER COLUMN code DROP NOT NULL;

-- 3. Ajouter une contrainte unique plus flexible sur (name, class_id, school_id)
-- Cela permet d'avoir le même nom de matière dans différentes classes de la même école
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_name_class_school_unique'
    ) THEN
        ALTER TABLE subjects ADD CONSTRAINT subjects_name_class_school_unique 
        UNIQUE (name, class_id, school_id);
    END IF;
END $$;

-- 4. Mettre à jour les enregistrements existants pour s'assurer qu'ils ont des codes valides
UPDATE subjects 
SET code = COALESCE(abbreviation, UPPER(LEFT(name, 3)))
WHERE code IS NULL OR code = '';

-- 5. Vérifier la structure finale
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;
