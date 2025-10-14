-- ============================================
-- PHASE 1 : CORRECTIONS CRITIQUES ECOGEST (VERSION CORRIGÉE)
-- ============================================

-- Étape 1.1 : Nettoyer les doublons de students.student_number
DO $$
DECLARE
  dup RECORD;
  keep_id UUID;
  del_id UUID;
BEGIN
  FOR dup IN 
    WITH dups AS (
      SELECT student_number, school_id,
             array_agg(id ORDER BY created_at) as ids
      FROM students
      WHERE student_number IS NOT NULL
      GROUP BY student_number, school_id
      HAVING COUNT(*) > 1
    )
    SELECT student_number, ids[1] as keep_id, unnest(ids[2:]) as del_id
    FROM dups
  LOOP
    keep_id := dup.keep_id;
    del_id := dup.del_id;
    
    UPDATE grades SET student_id = keep_id WHERE student_id = del_id;
    UPDATE payments SET student_id = keep_id WHERE student_id = del_id;
    UPDATE attendances SET student_id = keep_id WHERE student_id = del_id;
    UPDATE student_documents SET student_id = keep_id WHERE student_id = del_id;
    
    DELETE FROM students WHERE id = del_id;
    
    RAISE NOTICE 'Merged duplicate student %', dup.student_number;
  END LOOP;
END $$;

-- Étape 1.2 : Nettoyer les doublons de schedules
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN 
    WITH dups AS (
      SELECT class_id, day_of_week, start_time, school_id,
             array_agg(id ORDER BY created_at DESC) as ids
      FROM schedules
      GROUP BY class_id, day_of_week, start_time, school_id
      HAVING COUNT(*) > 1
    )
    SELECT ids[1] as keep_id, unnest(ids[2:]) as del_id
    FROM dups
  LOOP
    DELETE FROM schedules WHERE id = dup.del_id;
    RAISE NOTICE 'Deleted duplicate schedule %', dup.del_id;
  END LOOP;
END $$;

-- Étape 1.3 : Nettoyer doublons payments
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN 
    WITH dups AS (
      SELECT student_id, payment_month, payment_type, school_id,
             array_agg(id ORDER BY created_at DESC) as ids
      FROM payments
      WHERE payment_month IS NOT NULL AND payment_type IS NOT NULL
      GROUP BY student_id, payment_month, payment_type, school_id
      HAVING COUNT(*) > 1
    )
    SELECT ids[1] as keep_id, unnest(ids[2:]) as del_id
    FROM dups
  LOOP
    DELETE FROM payments WHERE id = dup.del_id;
    RAISE NOTICE 'Deleted duplicate payment %', dup.del_id;
  END LOOP;
END $$;

-- Étape 1.4 : Ajouter contraintes d'unicité
ALTER TABLE students 
DROP CONSTRAINT IF EXISTS students_student_number_school_unique;
ALTER TABLE students 
ADD CONSTRAINT students_student_number_school_unique 
UNIQUE (student_number, school_id);

ALTER TABLE teachers 
DROP CONSTRAINT IF EXISTS teachers_employee_number_school_unique;
ALTER TABLE teachers 
ADD CONSTRAINT teachers_employee_number_school_unique 
UNIQUE (employee_number, school_id);

ALTER TABLE subjects 
DROP CONSTRAINT IF EXISTS subjects_name_class_unique;
ALTER TABLE subjects 
ADD CONSTRAINT subjects_name_class_unique 
UNIQUE (name, class_id, school_id);

ALTER TABLE schedules 
DROP CONSTRAINT IF EXISTS schedules_no_time_conflict;
ALTER TABLE schedules 
ADD CONSTRAINT schedules_no_time_conflict 
UNIQUE (class_id, day_of_week, start_time, school_id);

ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_student_month_type_unique;
ALTER TABLE payments 
ADD CONSTRAINT payments_student_month_type_unique 
UNIQUE (student_id, payment_month, payment_type, school_id);

-- Étape 1.5 : Configuration autovacuum optimisée
ALTER TABLE announcements SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE academic_years SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE exams SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.1
);

ALTER TABLE schedules SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.1
);

ALTER TABLE subjects SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.1
);