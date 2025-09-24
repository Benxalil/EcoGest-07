-- Script pour nettoyer et corriger la table subjects

-- 1. Supprimer toutes les données existantes pour repartir à zéro
DELETE FROM subjects;

-- 2. Supprimer les contraintes problématiques
DO $$ 
BEGIN
    -- Supprimer toutes les contraintes d'unicité existantes
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_name_class_id_key'
    ) THEN
        ALTER TABLE subjects DROP CONSTRAINT subjects_name_class_id_key;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_abbreviation_class_id_key'
    ) THEN
        ALTER TABLE subjects DROP CONSTRAINT subjects_abbreviation_class_id_key;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_code_class_id_key'
    ) THEN
        ALTER TABLE subjects DROP CONSTRAINT subjects_code_class_id_key;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_name_class_school_unique'
    ) THEN
        ALTER TABLE subjects DROP CONSTRAINT subjects_name_class_school_unique;
    END IF;
END $$;

-- 3. Rendre la colonne code nullable
ALTER TABLE subjects ALTER COLUMN code DROP NOT NULL;

-- 4. Ajouter une contrainte unique plus flexible
-- Permet d'avoir le même nom de matière dans différentes classes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_unique_per_class'
    ) THEN
        ALTER TABLE subjects ADD CONSTRAINT subjects_unique_per_class 
        UNIQUE (name, class_id);
    END IF;
END $$;

-- 5. Vérifier la structure finale
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;

-- 6. Vérifier les classes disponibles
SELECT 
    id,
    name,
    level,
    section,
    school_id
FROM classes
ORDER BY name;
