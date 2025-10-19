-- Script pour créer la table grades avec la vraie structure des tables existantes
-- 1. Supprimer la table grades si elle existe
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

-- 4. Créer les contraintes de clé étrangère (seulement si les tables existent)
DO $$
BEGIN
  -- Vérifier si la table students existe et créer la contrainte
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students' AND table_schema = 'public') THEN
    ALTER TABLE grades 
    ADD CONSTRAINT fk_grades_student_id 
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
    RAISE NOTICE 'Contrainte fk_grades_student_id créée';
  ELSE
    RAISE NOTICE 'Table students non trouvée, contrainte fk_grades_student_id ignorée';
  END IF;

  -- Vérifier si la table subjects existe et créer la contrainte
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects' AND table_schema = 'public') THEN
    ALTER TABLE grades 
    ADD CONSTRAINT fk_grades_subject_id 
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
    RAISE NOTICE 'Contrainte fk_grades_subject_id créée';
  ELSE
    RAISE NOTICE 'Table subjects non trouvée, contrainte fk_grades_subject_id ignorée';
  END IF;

  -- Vérifier si la table schools existe et créer la contrainte
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schools' AND table_schema = 'public') THEN
    ALTER TABLE grades 
    ADD CONSTRAINT fk_grades_school_id 
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
    RAISE NOTICE 'Contrainte fk_grades_school_id créée';
  ELSE
    RAISE NOTICE 'Table schools non trouvée, contrainte fk_grades_school_id ignorée';
  END IF;
END $$;

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

-- 9. Tester l'insertion avec des données existantes (en utilisant les vraies colonnes)
DO $$
DECLARE
  test_student_id UUID;
  test_subject_id UUID;
  test_school_id UUID;
  test_grade_id UUID;
BEGIN
  -- Récupérer un étudiant existant (en utilisant la vraie structure)
  SELECT id INTO test_student_id FROM students LIMIT 1;
  
  -- Récupérer une matière existante
  SELECT id INTO test_subject_id FROM subjects LIMIT 1;
  
  -- Récupérer une école existante
  SELECT id INTO test_school_id FROM schools LIMIT 1;
  
  IF test_student_id IS NOT NULL AND test_subject_id IS NOT NULL AND test_school_id IS NOT NULL THEN
    -- Insérer une note de test
    INSERT INTO grades (student_id, subject_id, grade_value, max_grade, coefficient, exam_type, school_id)
    VALUES (
      test_student_id,
      test_subject_id,
      15.5,
      20,
      1.0,
      'composition',
      test_school_id
    )
    RETURNING id INTO test_grade_id;
    
    RAISE NOTICE '✅ Test insertion réussie avec des données existantes - ID: %', test_grade_id;
    
    -- Nettoyer le test
    DELETE FROM grades WHERE id = test_grade_id;
    RAISE NOTICE '✅ Test nettoyé';
  ELSE
    RAISE NOTICE '❌ Données de référence manquantes pour le test';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur lors du test: %', SQLERRM;
END $$;

-- 10. Vérifier que la table fonctionne
SELECT 'Table grades créée avec succès' as status;
SELECT COUNT(*) as total_grades FROM grades;
