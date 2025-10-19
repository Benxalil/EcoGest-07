-- Créer la table grades pour stocker les notes des élèves
CREATE TABLE IF NOT EXISTS grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  grade_value DECIMAL(5,2) NOT NULL,
  max_grade DECIMAL(5,2) NOT NULL,
  coefficient DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  semester VARCHAR(20), -- 'semestre1', 'semestre2', ou NULL pour les examens
  exam_type VARCHAR(50), -- 'devoir', 'composition', 'examen', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_exam_id ON grades(exam_id);
CREATE INDEX IF NOT EXISTS idx_grades_school_id ON grades(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_semester ON grades(semester);

-- Contrainte unique pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_grades_unique 
ON grades(student_id, subject_id, exam_id, semester, exam_type) 
WHERE exam_id IS NOT NULL;

-- Contrainte unique pour les notes sans examen
CREATE UNIQUE INDEX IF NOT EXISTS idx_grades_unique_no_exam 
ON grades(student_id, subject_id, semester, exam_type) 
WHERE exam_id IS NULL;

-- Activer RLS (Row Level Security)
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- Créer des politiques RLS
CREATE POLICY "Users can view grades from their school" ON grades
  FOR SELECT USING (
    school_id IN (
      SELECT id FROM schools 
      WHERE id = auth.jwt() ->> 'school_id'
    )
  );

CREATE POLICY "Users can insert grades for their school" ON grades
  FOR INSERT WITH CHECK (
    school_id IN (
      SELECT id FROM schools 
      WHERE id = auth.jwt() ->> 'school_id'
    )
  );

CREATE POLICY "Users can update grades from their school" ON grades
  FOR UPDATE USING (
    school_id IN (
      SELECT id FROM schools 
      WHERE id = auth.jwt() ->> 'school_id'
    )
  );

CREATE POLICY "Users can delete grades from their school" ON grades
  FOR DELETE USING (
    school_id IN (
      SELECT id FROM schools 
      WHERE id = auth.jwt() ->> 'school_id'
    )
  );

-- Ajouter des contraintes de validation
ALTER TABLE grades ADD CONSTRAINT check_grade_value_positive CHECK (grade_value >= 0);
ALTER TABLE grades ADD CONSTRAINT check_max_grade_positive CHECK (max_grade > 0);
ALTER TABLE grades ADD CONSTRAINT check_grade_not_exceed_max CHECK (grade_value <= max_grade);
ALTER TABLE grades ADD CONSTRAINT check_coefficient_positive CHECK (coefficient > 0);

-- Ajouter un commentaire
COMMENT ON TABLE grades IS 'Table pour stocker les notes des élèves par matière, examen et semestre';
