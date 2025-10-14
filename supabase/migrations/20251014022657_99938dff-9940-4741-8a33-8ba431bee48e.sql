-- ============================================
-- PHASE 2 : OPTIMISATION PERFORMANCE
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Index matricules
CREATE INDEX IF NOT EXISTS idx_students_student_number 
ON students(student_number) WHERE student_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teachers_employee_number 
ON teachers(employee_number) WHERE employee_number IS NOT NULL;

-- Index recherches nominatives
CREATE INDEX IF NOT EXISTS idx_students_names_trgm 
ON students USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_teachers_names_trgm 
ON teachers USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- Index paiements
CREATE INDEX IF NOT EXISTS idx_payments_month_school 
ON payments(payment_month, school_id) WHERE payment_month IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_student_date 
ON payments(student_id, payment_date DESC);

-- Index grades
CREATE INDEX IF NOT EXISTS idx_grades_exam_type_semester 
ON grades(exam_type, semester, school_id);

CREATE INDEX IF NOT EXISTS idx_grades_student_subject 
ON grades(student_id, subject_id, school_id);

-- Index parents
CREATE INDEX IF NOT EXISTS idx_students_parent_matricule 
ON students(parent_matricule) WHERE parent_matricule IS NOT NULL;

-- Index jointures
CREATE INDEX IF NOT EXISTS idx_students_class_school_active 
ON students(class_id, school_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_teachers_school_active 
ON teachers(school_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_subjects_class_school 
ON subjects(class_id, school_id);

-- Index schedules
CREATE INDEX IF NOT EXISTS idx_schedules_class_day 
ON schedules(class_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_schedules_teacher 
ON schedules(teacher_id) WHERE teacher_id IS NOT NULL;

-- Index attendances
CREATE INDEX IF NOT EXISTS idx_attendances_student_date 
ON attendances(student_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendances_class_date 
ON attendances(class_id, date DESC);

-- Index exams
CREATE INDEX IF NOT EXISTS idx_exams_class_subject 
ON exams(class_id, subject_id, exam_date DESC);

-- Analyser
ANALYZE students;
ANALYZE teachers;
ANALYZE payments;
ANALYZE grades;
ANALYZE subjects;
ANALYZE schedules;
ANALYZE attendances;
ANALYZE exams;

-- Vue monitoring
CREATE OR REPLACE VIEW slow_queries_monitoring AS
SELECT 
    LEFT(query, 100) as query_preview,
    calls,
    ROUND(mean_exec_time::numeric, 2) as avg_ms,
    ROUND(total_exec_time::numeric, 2) as total_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
  AND query NOT LIKE '%information_schema%'
  AND mean_exec_time > 50
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Vue index
CREATE OR REPLACE VIEW index_size_report AS
SELECT 
    schemaname,
    relname as table_name,
    indexrelname as index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) as size,
    idx_scan as scans
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;