-- Migration pour les sections Examens, Notes et Résultats
-- Vérifier et créer les tables manquantes

-- 1. Vérifier si la table exams existe et a les bonnes colonnes
DO $$
BEGIN
    -- Ajouter des colonnes manquantes à la table exams si elles n'existent pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'teacher_id') THEN
        ALTER TABLE exams ADD COLUMN teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'duration_minutes') THEN
        ALTER TABLE exams ADD COLUMN duration_minutes INTEGER DEFAULT 120;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'total_points') THEN
        ALTER TABLE exams ADD COLUMN total_points DECIMAL(5,2) DEFAULT 20.0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'is_published') THEN
        ALTER TABLE exams ADD COLUMN is_published BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Vérifier et corriger la table grades
DO $$
BEGIN
    -- Renommer les colonnes si nécessaire pour correspondre au hook useGrades
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grades' AND column_name = 'score') THEN
        ALTER TABLE grades RENAME COLUMN score TO marks_obtained;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grades' AND column_name = 'max_score') THEN
        ALTER TABLE grades RENAME COLUMN max_score TO max_marks;
    END IF;
    
    -- Ajouter des colonnes manquantes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grades' AND column_name = 'grade') THEN
        ALTER TABLE grades ADD COLUMN grade TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grades' AND column_name = 'remarks') THEN
        ALTER TABLE grades ADD COLUMN remarks TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grades' AND column_name = 'graded_by') THEN
        ALTER TABLE grades ADD COLUMN graded_by UUID REFERENCES public.teachers(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grades' AND column_name = 'graded_at') THEN
        ALTER TABLE grades ADD COLUMN graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_teacher_id ON exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_exams_is_published ON exams(is_published);

CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_exam_id ON grades(exam_id);
CREATE INDEX IF NOT EXISTS idx_grades_graded_by ON grades(graded_by);

-- 4. Créer des contraintes de validation
DO $$
BEGIN
    -- Contrainte pour s'assurer que les notes sont dans une plage valide
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_marks_range') THEN
        ALTER TABLE grades ADD CONSTRAINT check_marks_range 
        CHECK (marks_obtained >= 0 AND marks_obtained <= max_marks);
    END IF;
    
    -- Contrainte pour s'assurer que la durée de l'examen est positive
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_duration_positive') THEN
        ALTER TABLE exams ADD CONSTRAINT check_duration_positive 
        CHECK (duration_minutes > 0);
    END IF;
    
    -- Contrainte pour s'assurer que le total des points est positif
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_total_points_positive') THEN
        ALTER TABLE exams ADD CONSTRAINT check_total_points_positive 
        CHECK (total_points > 0);
    END IF;
END $$;

-- 5. Activer RLS (Row Level Security) si ce n'est pas déjà fait
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- 6. Créer les politiques RLS pour exams
DO $$
BEGIN
    -- Politique pour la lecture des examens
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exams' AND policyname = 'Allow read access to school exams') THEN
        CREATE POLICY "Allow read access to school exams"
        ON exams FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.school_id = exams.school_id
            )
        );
    END IF;
    
    -- Politique pour la création d'examens
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exams' AND policyname = 'Allow school_admin to create exams') THEN
        CREATE POLICY "Allow school_admin to create exams"
        ON exams FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.school_id = exams.school_id
                AND profiles.role = 'school_admin'
            )
        );
    END IF;
    
    -- Politique pour la mise à jour des examens
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exams' AND policyname = 'Allow school_admin to update exams') THEN
        CREATE POLICY "Allow school_admin to update exams"
        ON exams FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.school_id = exams.school_id
                AND profiles.role = 'school_admin'
            )
        );
    END IF;
    
    -- Politique pour la suppression des examens
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exams' AND policyname = 'Allow school_admin to delete exams') THEN
        CREATE POLICY "Allow school_admin to delete exams"
        ON exams FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.school_id = exams.school_id
                AND profiles.role = 'school_admin'
            )
        );
    END IF;
END $$;

-- 7. Créer les politiques RLS pour grades
DO $$
BEGIN
    -- Politique pour la lecture des notes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grades' AND policyname = 'Allow read access to school grades') THEN
        CREATE POLICY "Allow read access to school grades"
        ON grades FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.school_id = grades.school_id
            )
        );
    END IF;
    
    -- Politique pour la création de notes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grades' AND policyname = 'Allow school_admin to create grades') THEN
        CREATE POLICY "Allow school_admin to create grades"
        ON grades FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.school_id = grades.school_id
                AND profiles.role = 'school_admin'
            )
        );
    END IF;
    
    -- Politique pour la mise à jour de notes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grades' AND policyname = 'Allow school_admin to update grades') THEN
        CREATE POLICY "Allow school_admin to update grades"
        ON grades FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.school_id = grades.school_id
                AND profiles.role = 'school_admin'
            )
        );
    END IF;
    
    -- Politique pour la suppression de notes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grades' AND policyname = 'Allow school_admin to delete grades') THEN
        CREATE POLICY "Allow school_admin to delete grades"
        ON grades FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.school_id = grades.school_id
                AND profiles.role = 'school_admin'
            )
        );
    END IF;
END $$;

-- 8. Créer des fonctions utilitaires pour les calculs de moyennes
CREATE OR REPLACE FUNCTION calculate_student_average(student_id UUID, class_id UUID, semester INTEGER)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_weighted_marks DECIMAL(10,2) := 0;
    total_coefficient DECIMAL(10,2) := 0;
    average DECIMAL(5,2);
BEGIN
    SELECT 
        COALESCE(SUM(g.marks_obtained * s.coefficient), 0),
        COALESCE(SUM(s.coefficient), 0)
    INTO total_weighted_marks, total_coefficient
    FROM grades g
    JOIN exams e ON g.exam_id = e.id
    JOIN subjects s ON e.subject_id = s.id
    WHERE g.student_id = calculate_student_average.student_id
    AND e.class_id = calculate_student_average.class_id
    AND (semester IS NULL OR EXTRACT(MONTH FROM e.exam_date) BETWEEN 
        CASE WHEN semester = 1 THEN 9 ELSE 2 END AND 
        CASE WHEN semester = 1 THEN 1 ELSE 6 END);
    
    IF total_coefficient > 0 THEN
        average := total_weighted_marks / total_coefficient;
    ELSE
        average := 0;
    END IF;
    
    RETURN ROUND(average, 2);
END;
$$ LANGUAGE plpgsql;

-- 9. Créer une vue pour les résultats des étudiants
CREATE OR REPLACE VIEW student_results AS
SELECT 
    s.id as student_id,
    s.first_name,
    s.last_name,
    s.student_number,
    c.id as class_id,
    c.name as class_name,
    c.level,
    c.section,
    calculate_student_average(s.id, c.id, 1) as semester1_average,
    calculate_student_average(s.id, c.id, 2) as semester2_average,
    calculate_student_average(s.id, c.id, NULL) as annual_average
FROM students s
JOIN classes c ON s.class_id = c.id
WHERE s.is_active = true;

-- 10. Créer des triggers pour mettre à jour les timestamps
CREATE OR REPLACE FUNCTION update_exams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers
DROP TRIGGER IF EXISTS exams_updated_at_trigger ON exams;
CREATE TRIGGER exams_updated_at_trigger
    BEFORE UPDATE ON exams
    FOR EACH ROW
    EXECUTE FUNCTION update_exams_updated_at();

DROP TRIGGER IF EXISTS grades_updated_at_trigger ON grades;
CREATE TRIGGER grades_updated_at_trigger
    BEFORE UPDATE ON grades
    FOR EACH ROW
    EXECUTE FUNCTION update_grades_updated_at();
