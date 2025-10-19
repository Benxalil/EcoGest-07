-- Migration pour ajouter les cascades de suppression automatique
-- Ceci garantit que la suppression d'un élève ou enseignant supprime toutes ses données associées

-- ============================================================================
-- PARTIE 1 : CASCADES POUR LES ÉLÈVES (students)
-- ============================================================================

-- Supprimer les anciennes contraintes et les recréer avec ON DELETE CASCADE

-- 1. Table grades (notes des élèves)
ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_student_id_fkey;
ALTER TABLE grades ADD CONSTRAINT grades_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- 2. Table payments (paiements des élèves)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_student_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- 3. Table attendances (absences/retards des élèves)
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_student_id_fkey;
ALTER TABLE attendances ADD CONSTRAINT attendances_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- 4. Table student_documents (documents des élèves)
ALTER TABLE student_documents DROP CONSTRAINT IF EXISTS student_documents_student_id_fkey;
ALTER TABLE student_documents ADD CONSTRAINT student_documents_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- 5. Table student_grades (anciennes notes si utilisée)
ALTER TABLE student_grades DROP CONSTRAINT IF EXISTS student_grades_student_id_fkey;
ALTER TABLE student_grades ADD CONSTRAINT student_grades_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- ============================================================================
-- PARTIE 2 : CASCADES POUR LES ENSEIGNANTS (teachers)
-- ============================================================================

-- 1. Table schedules (emplois du temps des enseignants)
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_teacher_id_fkey;
ALTER TABLE schedules ADD CONSTRAINT schedules_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;

-- 2. Table teacher_subjects (matières enseignées)
ALTER TABLE teacher_subjects DROP CONSTRAINT IF EXISTS teacher_subjects_teacher_id_fkey;
ALTER TABLE teacher_subjects ADD CONSTRAINT teacher_subjects_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;

-- 3. Table lesson_logs (cahier de texte des enseignants)
ALTER TABLE lesson_logs DROP CONSTRAINT IF EXISTS lesson_logs_teacher_id_fkey;
ALTER TABLE lesson_logs ADD CONSTRAINT lesson_logs_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;

-- 4. Table attendances (absences enregistrées par l'enseignant)
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_teacher_id_fkey;
ALTER TABLE attendances ADD CONSTRAINT attendances_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

-- 5. Table exams (examens créés par l'enseignant)
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_teacher_id_fkey;
ALTER TABLE exams ADD CONSTRAINT exams_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

-- ============================================================================
-- PARTIE 3 : LIEN AVEC LES COMPTES AUTH (user_id)
-- ============================================================================

-- Pour students.user_id -> profiles.id
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_user_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Pour teachers.user_id -> profiles.id
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_user_id_fkey;
ALTER TABLE teachers ADD CONSTRAINT teachers_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Note: profiles.id référence déjà auth.users(id) avec ON DELETE CASCADE
-- Donc supprimer un user dans auth.users supprimera automatiquement son profil

-- ============================================================================
-- PARTIE 4 : FONCTION POUR SUPPRIMER COMPLÈTEMENT UN ÉLÈVE
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_student_completely(student_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Récupérer l'ID du compte auth associé
  SELECT user_id INTO user_uuid FROM students WHERE id = student_uuid;
  
  -- Supprimer l'élève (cascade supprimera toutes ses données)
  DELETE FROM students WHERE id = student_uuid;
  
  -- Supprimer le compte auth si il existe
  IF user_uuid IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = user_uuid;
  END IF;
END;
$$;

-- ============================================================================
-- PARTIE 5 : FONCTION POUR SUPPRIMER COMPLÈTEMENT UN ENSEIGNANT
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_teacher_completely(teacher_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Récupérer l'ID du compte auth associé
  SELECT user_id INTO user_uuid FROM teachers WHERE id = teacher_uuid;
  
  -- Supprimer l'enseignant (cascade supprimera toutes ses données)
  DELETE FROM teachers WHERE id = teacher_uuid;
  
  -- Supprimer le compte auth si il existe
  IF user_uuid IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = user_uuid;
  END IF;
END;
$$;

-- ============================================================================
-- VÉRIFICATIONS
-- ============================================================================

-- Vérifier que les cascades sont bien en place
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (
    (tc.table_name IN ('grades', 'payments', 'attendances', 'student_documents', 'student_grades') 
     AND kcu.column_name = 'student_id')
    OR
    (tc.table_name IN ('schedules', 'teacher_subjects', 'lesson_logs', 'attendances', 'exams') 
     AND kcu.column_name = 'teacher_id')
  )
ORDER BY tc.table_name, kcu.column_name;