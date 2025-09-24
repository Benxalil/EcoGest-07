-- Script pour s'assurer que la table grades existe avec la bonne structure
-- Vérifier d'abord si la table existe
DO $$
BEGIN
    -- Vérifier si la table grades existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades' AND table_schema = 'public') THEN
        -- Créer la table grades
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
        
        -- Ajouter les contraintes de clé étrangère
        ALTER TABLE grades 
        ADD CONSTRAINT fk_grades_student_id 
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
        
        ALTER TABLE grades 
        ADD CONSTRAINT fk_grades_subject_id 
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
        
        ALTER TABLE grades 
        ADD CONSTRAINT fk_grades_exam_id 
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;
        
        ALTER TABLE grades 
        ADD CONSTRAINT fk_grades_created_by 
        FOREIGN KEY (created_by) REFERENCES profiles(id);
        
        ALTER TABLE grades 
        ADD CONSTRAINT fk_grades_school_id 
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
        
        -- Créer les index
        CREATE INDEX idx_grades_student_id ON grades(student_id);
        CREATE INDEX idx_grades_subject_id ON grades(subject_id);
        CREATE INDEX idx_grades_exam_id ON grades(exam_id);
        CREATE INDEX idx_grades_school_id ON grades(school_id);
        CREATE INDEX idx_grades_semester ON grades(semester);
        
        -- Activer RLS
        ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
        
        -- Créer les politiques RLS
        CREATE POLICY "Users can view grades from their school" ON grades
        FOR SELECT USING (
            school_id = (auth.jwt() ->> 'school_id')::uuid
        );
        
        CREATE POLICY "Users can insert grades for their school" ON grades
        FOR INSERT WITH CHECK (
            school_id = (auth.jwt() ->> 'school_id')::uuid
        );
        
        CREATE POLICY "Users can update grades from their school" ON grades
        FOR UPDATE USING (
            school_id = (auth.jwt() ->> 'school_id')::uuid
        );
        
        CREATE POLICY "Users can delete grades from their school" ON grades
        FOR DELETE USING (
            school_id = (auth.jwt() ->> 'school_id')::uuid
        );
        
        -- Ajouter les contraintes de validation
        ALTER TABLE grades ADD CONSTRAINT check_grade_value_positive CHECK (grade_value >= 0);
        ALTER TABLE grades ADD CONSTRAINT check_max_grade_positive CHECK (max_grade > 0);
        ALTER TABLE grades ADD CONSTRAINT check_grade_not_exceed_max CHECK (grade_value <= max_grade);
        ALTER TABLE grades ADD CONSTRAINT check_coefficient_positive CHECK (coefficient > 0);
        
        RAISE NOTICE 'Table grades créée avec succès';
    ELSE
        RAISE NOTICE 'Table grades existe déjà';
    END IF;
END $$;

-- Vérifier la structure de la table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;
