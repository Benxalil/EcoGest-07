-- Ajout des informations médicales dans la table students
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS has_medical_condition BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS medical_condition_type TEXT,
ADD COLUMN IF NOT EXISTS medical_condition_description TEXT,
ADD COLUMN IF NOT EXISTS doctor_name TEXT,
ADD COLUMN IF NOT EXISTS doctor_phone TEXT;

-- Index pour recherches d'élèves avec conditions médicales
CREATE INDEX IF NOT EXISTS idx_students_medical 
ON students(school_id, has_medical_condition) 
WHERE has_medical_condition = true;

-- Commentaires pour documentation
COMMENT ON COLUMN students.has_medical_condition IS 'Indique si l''élève a une condition médicale';
COMMENT ON COLUMN students.medical_condition_type IS 'Type de maladie (asthme, diabète, allergie, etc.)';
COMMENT ON COLUMN students.medical_condition_description IS 'Description détaillée et traitement';
COMMENT ON COLUMN students.doctor_name IS 'Nom du médecin traitant';
COMMENT ON COLUMN students.doctor_phone IS 'Numéro du médecin traitant';

-- Fonction de logging pour accès aux données médicales
CREATE OR REPLACE FUNCTION log_medical_info_access()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.has_medical_condition = true THEN
    INSERT INTO audit_logs (
      category,
      level,
      message,
      user_id,
      school_id,
      details
    ) VALUES (
      'data_access',
      'info',
      'Accès aux informations médicales d''un élève',
      auth.uid(),
      NEW.school_id,
      jsonb_build_object(
        'student_id', NEW.id,
        'student_number', NEW.student_number,
        'has_condition', NEW.has_medical_condition
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour audit des accès médicaux (sur UPDATE uniquement pour éviter spam)
DROP TRIGGER IF EXISTS audit_medical_access ON students;
CREATE TRIGGER audit_medical_access
AFTER UPDATE ON students
FOR EACH ROW
WHEN (NEW.has_medical_condition = true AND OLD.has_medical_condition IS DISTINCT FROM NEW.has_medical_condition)
EXECUTE FUNCTION log_medical_info_access();