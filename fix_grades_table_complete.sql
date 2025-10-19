-- Script complet pour réparer la table grades et résoudre l'erreur 400
-- 1. Supprimer la table si elle existe (avec toutes les contraintes)
DROP TABLE IF EXISTS grades CASCADE;

-- 2. Créer la table grades avec la structure correcte
CREATE TABLE grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  exam_id UUID,
  grade_value DECIMAL(5,2) NOT NULL,
  max_grade DECIMAL(5,2) NOT NULL,
  coefficient DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  semester VARCHAR(20),
  exam_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  school_id UUID NOT NULL,
  
  -- Contraintes de validation
  CONSTRAINT grades_grade_value_check CHECK (grade_value >= 0 AND grade_value <= max_grade),
  CONSTRAINT grades_max_grade_check CHECK (max_grade > 0),
  CONSTRAINT grades_coefficient_check CHECK (coefficient > 0),
  CONSTRAINT grades_exam_type_check CHECK (exam_type IN ('examen', 'devoir', 'composition', 'controle', 'tp'))
);

-- 3. Créer les index pour améliorer les performances
CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_subject_id ON grades(subject_id);
CREATE INDEX idx_grades_exam_id ON grades(exam_id);
CREATE INDEX idx_grades_school_id ON grades(school_id);
CREATE INDEX idx_grades_semester ON grades(semester);
CREATE INDEX idx_grades_exam_type ON grades(exam_type);

-- 4. Créer les contraintes de clé étrangère
ALTER TABLE grades 
ADD CONSTRAINT fk_grades_student_id 
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE grades 
ADD CONSTRAINT fk_grades_subject_id 
FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE grades 
ADD CONSTRAINT fk_grades_school_id 
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- 5. Créer une contrainte d'unicité pour éviter les doublons
CREATE UNIQUE INDEX idx_grades_unique_grade 
ON grades(student_id, subject_id, exam_id, semester, exam_type) 
WHERE exam_id IS NOT NULL;

-- 6. Créer une contrainte d'unicité pour les notes sans examen
CREATE UNIQUE INDEX idx_grades_unique_grade_no_exam 
ON grades(student_id, subject_id, semester, exam_type) 
WHERE exam_id IS NULL;

-- 7. Activer RLS (Row Level Security)
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- 8. Créer les politiques RLS
CREATE POLICY "Users can view grades from their school" ON grades
  FOR SELECT USING (school_id::text = (auth.jwt() ->> 'school_id'));

CREATE POLICY "Users can insert grades for their school" ON grades
  FOR INSERT WITH CHECK (school_id::text = (auth.jwt() ->> 'school_id'));

CREATE POLICY "Users can update grades from their school" ON grades
  FOR UPDATE USING (school_id::text = (auth.jwt() ->> 'school_id'));

CREATE POLICY "Users can delete grades from their school" ON grades
  FOR DELETE USING (school_id::text = (auth.jwt() ->> 'school_id'));

-- 9. Tester l'insertion
INSERT INTO grades (student_id, subject_id, grade_value, max_grade, coefficient, exam_type, school_id)
VALUES (
  'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'::uuid,
  '2f64cfa6-cc9d-42da-95c3-68b615ddc2aa'::uuid,
  15.5,
  20,
  1.0,
  'composition',
  '0adfd464-9161-4552-92ba-419cf8bb3199'::uuid
);

-- 10. Vérifier que l'insertion a fonctionné
SELECT 'Test insertion réussie' as status, COUNT(*) as total_grades FROM grades;

-- 11. Nettoyer le test
DELETE FROM grades WHERE student_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'::uuid;
