-- Script pour gérer le cas où la table grades existe déjà
-- 1. Vérifier d'abord si la table existe et sa structure
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades' AND table_schema = 'public') 
    THEN 'Table grades EXISTE'
    ELSE 'Table grades N''EXISTE PAS'
  END as table_status;

-- 2. Vérifier la structure actuelle de la table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Si la table existe mais n'a pas la bonne structure, la supprimer et la recréer
DROP TABLE IF EXISTS grades CASCADE;

-- 4. Recréer la table avec la bonne structure
CREATE TABLE grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  exam_id UUID,
  grade_value DECIMAL(5,2) NOT NULL,
  max_grade DECIMAL(5,2) NOT NULL,
  coefficient DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  semester VARCHAR(20),
  exam_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  school_id UUID NOT NULL
);

-- 5. Ajouter les contraintes de clé étrangère
ALTER TABLE grades 
ADD CONSTRAINT fk_grades_student_id 
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE grades 
ADD CONSTRAINT fk_grades_subject_id 
FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE grades 
ADD CONSTRAINT fk_grades_school_id 
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- 6. Créer des index pour les performances
CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_subject_id ON grades(subject_id);
CREATE INDEX idx_grades_school_id ON grades(school_id);

-- 7. Vérifier que la table a été créée correctement
SELECT 'Table grades créée avec succès' as status;
