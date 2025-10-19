-- Script pour corriger les contraintes d'unicité de la table subjects
-- Permet d'avoir la même matière dans différentes classes

-- 1. Supprimer toutes les contraintes d'unicité existantes
DO $$ 
BEGIN
    -- Supprimer la contrainte unique sur name seulement
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_name_key'
    ) THEN
        ALTER TABLE subjects DROP CONSTRAINT subjects_name_key;
    END IF;

    -- Supprimer la contrainte unique sur (name, school_id)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_name_school_id_key'
    ) THEN
        ALTER TABLE subjects DROP CONSTRAINT subjects_name_school_id_key;
    END IF;

    -- Supprimer la contrainte unique sur (name, class_id, school_id)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_name_class_school_unique'
    ) THEN
        ALTER TABLE subjects DROP CONSTRAINT subjects_name_class_school_unique;
    END IF;

    -- Supprimer la contrainte unique sur (name, class_id)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_name_class_id_key'
    ) THEN
        ALTER TABLE subjects DROP CONSTRAINT subjects_name_class_id_key;
    END IF;

    -- Supprimer la contrainte unique sur abbreviation
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_abbreviation_key'
    ) THEN
        ALTER TABLE subjects DROP CONSTRAINT subjects_abbreviation_key;
    END IF;

    -- Supprimer la contrainte unique sur code
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subjects' 
        AND constraint_name = 'subjects_code_key'
    ) THEN
        ALTER TABLE subjects DROP CONSTRAINT subjects_code_key;
    END IF;
END $$;

-- 2. Ajouter une contrainte unique correcte
-- Permet d'avoir la même matière dans différentes classes
-- Mais empêche les doublons dans la même classe
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

-- 3. Vérifier les contraintes existantes
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

-- 4. Tester avec des données d'exemple
-- Insérer la même matière pour deux classes différentes
INSERT INTO subjects (id, name, abbreviation, code, class_id, school_id, hours_per_week, color)
SELECT 
    gen_random_uuid(),
    'Mathématiques',
    'MATH',
    'MATH',
    c.id,
    c.school_id,
    5,
    '#3B82F6'
FROM classes c
WHERE NOT EXISTS (
    SELECT 1 FROM subjects s 
    WHERE s.name = 'Mathématiques' 
    AND s.class_id = c.id
)
LIMIT 2;

-- 5. Vérifier que les matières ont été créées pour différentes classes
SELECT 
    s.name,
    s.abbreviation,
    c.name as class_name,
    c.level,
    c.section
FROM subjects s
JOIN classes c ON s.class_id = c.id
WHERE s.name = 'Mathématiques'
ORDER BY c.name;
