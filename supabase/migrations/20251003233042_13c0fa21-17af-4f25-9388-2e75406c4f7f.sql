-- 1. Supprimer l'ancienne contrainte d'unicité qui empêchait CM1 A et CM1 B
ALTER TABLE classes 
DROP CONSTRAINT IF EXISTS classes_school_id_academic_year_id_name_key;

-- 2. Créer la nouvelle contrainte incluant section pour permettre les libellés différents
-- Cela permet : CM1 A, CM1 B, CM2 A, etc.
ALTER TABLE classes 
ADD CONSTRAINT classes_unique_name_section_year 
UNIQUE (school_id, academic_year_id, name, section);

-- Commentaire explicatif
COMMENT ON CONSTRAINT classes_unique_name_section_year ON classes IS 
'Permet de créer plusieurs classes du même niveau (ex: CM1 A, CM1 B) différenciées uniquement par le libellé (contenu dans section)';