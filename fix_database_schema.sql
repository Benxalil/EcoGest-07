-- Script de correction complet pour les problèmes de schéma de base de données

-- 1. Corriger la table schedules
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS day VARCHAR(20) NOT NULL DEFAULT 'Lundi';

-- Ajouter les colonnes manquantes
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS subject VARCHAR(100) NOT NULL DEFAULT 'Matière';

-- Corriger la colonne subject_id pour accepter les valeurs null
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id);

-- Rendre subject_id nullable si elle existe déjà avec NOT NULL
ALTER TABLE schedules 
ALTER COLUMN subject_id DROP NOT NULL;

ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS teacher VARCHAR(100);

-- Ajouter la colonne teacher_id et la rendre nullable
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id);

-- Rendre teacher_id nullable
ALTER TABLE schedules 
ALTER COLUMN teacher_id DROP NOT NULL;

ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS start_time TIME NOT NULL DEFAULT '08:00:00';

ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS end_time TIME NOT NULL DEFAULT '09:00:00';

ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id);

ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- Mettre à jour les enregistrements existants
UPDATE schedules 
SET day = 'Lundi' 
WHERE day IS NULL OR day = '';

UPDATE schedules 
SET subject = 'Matière' 
WHERE subject IS NULL OR subject = '';

UPDATE schedules 
SET start_time = '08:00:00' 
WHERE start_time IS NULL;

UPDATE schedules 
SET end_time = '09:00:00' 
WHERE end_time IS NULL;

-- S'assurer que subject_id peut être null
UPDATE schedules 
SET subject_id = NULL 
WHERE subject_id IS NOT NULL AND subject_id NOT IN (SELECT id FROM subjects);

-- Ajouter une contrainte pour s'assurer que day a une valeur valide
DO $$ 
BEGIN
    -- Supprimer la contrainte existante si elle existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_day_valid' 
        AND table_name = 'schedules'
    ) THEN
        ALTER TABLE schedules DROP CONSTRAINT check_day_valid;
    END IF;
    
    -- Ajouter la nouvelle contrainte
    ALTER TABLE schedules 
    ADD CONSTRAINT check_day_valid 
    CHECK (day IN ('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'));
END $$;

-- Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_schedules_day ON schedules(day);
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_school_id ON schedules(school_id);
CREATE INDEX IF NOT EXISTS idx_schedules_subject ON schedules(subject);

-- Ajouter des contraintes pour les heures (seulement si elles n'existent pas)
DO $$ 
BEGIN
    -- Vérifier et ajouter check_start_time_valid
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_start_time_valid' 
        AND table_name = 'schedules'
    ) THEN
        ALTER TABLE schedules 
        ADD CONSTRAINT check_start_time_valid 
        CHECK (start_time >= '00:00:00' AND start_time <= '23:59:59');
    END IF;

    -- Vérifier et ajouter check_end_time_valid
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_end_time_valid' 
        AND table_name = 'schedules'
    ) THEN
        ALTER TABLE schedules 
        ADD CONSTRAINT check_end_time_valid 
        CHECK (end_time >= '00:00:00' AND end_time <= '23:59:59');
    END IF;

    -- Vérifier et ajouter check_time_order
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_time_order' 
        AND table_name = 'schedules'
    ) THEN
        ALTER TABLE schedules 
        ADD CONSTRAINT check_time_order 
        CHECK (end_time > start_time);
    END IF;
END $$;

-- 2. Corriger la table schools
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free';

-- Mettre à jour les enregistrements existants
UPDATE schools 
SET subscription_plan = 'free' 
WHERE subscription_plan IS NULL;

-- Ajouter une contrainte pour s'assurer que subscription_plan a une valeur valide
DO $$ 
BEGIN
    -- Supprimer la contrainte existante si elle existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_subscription_plan_valid' 
        AND table_name = 'schools'
    ) THEN
        ALTER TABLE schools DROP CONSTRAINT check_subscription_plan_valid;
    END IF;
    
    -- Ajouter la nouvelle contrainte
    ALTER TABLE schools 
    ADD CONSTRAINT check_subscription_plan_valid 
    CHECK (subscription_plan IN ('free', 'basic', 'premium', 'enterprise'));
END $$;

-- Créer un index sur la colonne subscription_plan
CREATE INDEX IF NOT EXISTS idx_schools_subscription_plan ON schools(subscription_plan);

-- 3. Vérifier les structures des tables
SELECT 'schedules' as table_name, column_name, data_type, is_nullable, ordinal_position
FROM information_schema.columns 
WHERE table_name = 'schedules' 
UNION ALL
SELECT 'schools' as table_name, column_name, data_type, is_nullable, ordinal_position
FROM information_schema.columns 
WHERE table_name = 'schools'
ORDER BY table_name, ordinal_position;

-- 4. Afficher un message de confirmation
SELECT 'Corrections appliquées avec succès!' as status;
