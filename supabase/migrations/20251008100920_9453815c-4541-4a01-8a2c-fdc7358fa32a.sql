-- Phase 1: Correction et normalisation de la table schedules
-- Migration pour synchroniser teacher_id et subject_id

-- Étape 1: Remplir teacher_id automatiquement depuis teacher (texte)
UPDATE schedules s
SET teacher_id = t.id
FROM teachers t
WHERE s.teacher_id IS NULL
  AND s.teacher IS NOT NULL
  AND s.school_id = t.school_id
  AND CONCAT(t.first_name, ' ', t.last_name) = s.teacher;

-- Étape 2: Remplir subject_id automatiquement depuis subject (texte)
UPDATE schedules s
SET subject_id = sub.id
FROM subjects sub
WHERE s.subject_id IS NULL
  AND s.subject IS NOT NULL
  AND s.school_id = sub.school_id
  AND sub.name = s.subject;

-- Étape 3: Créer une fonction de synchronisation automatique pour teacher_id
CREATE OR REPLACE FUNCTION sync_schedule_teacher_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Si teacher_id est NULL mais teacher (texte) existe
  IF NEW.teacher_id IS NULL AND NEW.teacher IS NOT NULL THEN
    -- Trouver le teacher_id correspondant
    SELECT id INTO NEW.teacher_id 
    FROM teachers 
    WHERE CONCAT(first_name, ' ', last_name) = NEW.teacher
      AND school_id = NEW.school_id
    LIMIT 1;
  END IF;
  
  -- Si subject_id est NULL mais subject (texte) existe
  IF NEW.subject_id IS NULL AND NEW.subject IS NOT NULL THEN
    -- Trouver le subject_id correspondant
    SELECT id INTO NEW.subject_id
    FROM subjects
    WHERE name = NEW.subject
      AND school_id = NEW.school_id
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Étape 4: Créer un trigger BEFORE INSERT OR UPDATE
DROP TRIGGER IF EXISTS trigger_sync_schedule_ids ON schedules;
CREATE TRIGGER trigger_sync_schedule_ids
  BEFORE INSERT OR UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION sync_schedule_teacher_id();

-- Étape 5: Vérification des données synchronisées
SELECT 
  COUNT(*) FILTER (WHERE teacher_id IS NOT NULL) as schedules_with_teacher_id,
  COUNT(*) FILTER (WHERE teacher_id IS NULL AND teacher IS NOT NULL) as schedules_missing_teacher_id,
  COUNT(*) FILTER (WHERE subject_id IS NOT NULL) as schedules_with_subject_id,
  COUNT(*) FILTER (WHERE subject_id IS NULL AND subject IS NOT NULL) as schedules_missing_subject_id
FROM schedules;