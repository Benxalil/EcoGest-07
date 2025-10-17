-- Phase 1: Ajout des nouveaux champs pour le PÈRE et la MÈRE dans la table students
-- Ajouter les colonnes pour le PÈRE
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS father_first_name TEXT,
ADD COLUMN IF NOT EXISTS father_last_name TEXT,
ADD COLUMN IF NOT EXISTS father_phone TEXT,
ADD COLUMN IF NOT EXISTS father_address TEXT,
ADD COLUMN IF NOT EXISTS father_status TEXT CHECK (father_status IN ('alive', 'deceased')),
ADD COLUMN IF NOT EXISTS father_profession TEXT;

-- Ajouter les colonnes pour la MÈRE
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS mother_first_name TEXT,
ADD COLUMN IF NOT EXISTS mother_last_name TEXT,
ADD COLUMN IF NOT EXISTS mother_phone TEXT,
ADD COLUMN IF NOT EXISTS mother_address TEXT,
ADD COLUMN IF NOT EXISTS mother_status TEXT CHECK (mother_status IN ('alive', 'deceased')),
ADD COLUMN IF NOT EXISTS mother_profession TEXT;

-- Phase 6: Migration des données existantes (père uniquement)
-- Copier les données parent existantes vers father_*
UPDATE students 
SET 
  father_first_name = parent_first_name,
  father_last_name = parent_last_name,
  father_phone = parent_phone,
  father_address = address,
  father_status = 'alive'
WHERE parent_first_name IS NOT NULL AND father_first_name IS NULL;

-- Ajouter des index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_students_father_names ON students(father_first_name, father_last_name);
CREATE INDEX IF NOT EXISTS idx_students_mother_names ON students(mother_first_name, mother_last_name);

-- Commentaires pour documentation
COMMENT ON COLUMN students.father_first_name IS 'Prénom du père';
COMMENT ON COLUMN students.father_last_name IS 'Nom du père';
COMMENT ON COLUMN students.father_phone IS 'Téléphone du père';
COMMENT ON COLUMN students.father_address IS 'Adresse du père';
COMMENT ON COLUMN students.father_status IS 'Statut de vie du père (alive/deceased)';
COMMENT ON COLUMN students.father_profession IS 'Profession/fonction du père';
COMMENT ON COLUMN students.mother_first_name IS 'Prénom de la mère';
COMMENT ON COLUMN students.mother_last_name IS 'Nom de la mère';
COMMENT ON COLUMN students.mother_phone IS 'Téléphone de la mère';
COMMENT ON COLUMN students.mother_address IS 'Adresse de la mère';
COMMENT ON COLUMN students.mother_status IS 'Statut de vie de la mère (alive/deceased)';
COMMENT ON COLUMN students.mother_profession IS 'Profession/fonction de la mère';