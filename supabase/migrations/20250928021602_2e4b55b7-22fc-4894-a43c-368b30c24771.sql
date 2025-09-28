-- Migration pour corriger l'isolation des notes par examen
-- Associer les notes orphelines (exam_id = null) aux examens appropriés

-- Étape 1: Identifier les notes sans exam_id
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count FROM grades WHERE exam_id IS NULL;
    RAISE NOTICE 'Notes orphelines trouvées: %', orphan_count;
END $$;

-- Étape 2: Créer une fonction pour associer les notes aux examens par contexte
-- Cette fonction va essayer de retrouver l'examen approprié basé sur:
-- 1. Le student_id et subject_id
-- 2. La date de création la plus proche
-- 3. Le type d'examen (exam_type)

CREATE OR REPLACE FUNCTION associate_orphan_grades_to_exams()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    grade_record RECORD;
    target_exam_id UUID;
    updated_count INTEGER := 0;
BEGIN
    -- Parcourir toutes les notes orphelines
    FOR grade_record IN 
        SELECT g.id, g.student_id, g.subject_id, g.exam_type, g.created_at, g.school_id
        FROM grades g 
        WHERE g.exam_id IS NULL
        ORDER BY g.created_at DESC
    LOOP
        -- Essayer de trouver un examen correspondant
        SELECT e.id INTO target_exam_id
        FROM exams e
        WHERE e.school_id = grade_record.school_id
          AND e.subject_id = grade_record.subject_id
        ORDER BY ABS(EXTRACT(EPOCH FROM (e.created_at - grade_record.created_at)))
        LIMIT 1;
        
        -- Si un examen est trouvé, associer la note à cet examen
        IF target_exam_id IS NOT NULL THEN
            UPDATE grades 
            SET exam_id = target_exam_id,
                updated_at = NOW()
            WHERE id = grade_record.id;
            
            updated_count := updated_count + 1;
            
            RAISE NOTICE 'Note % associée à l''examen %', grade_record.id, target_exam_id;
        ELSE
            RAISE NOTICE 'Aucun examen trouvé pour la note %', grade_record.id;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$;

-- Étape 3: Exécuter la fonction pour associer les notes orphelines
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT associate_orphan_grades_to_exams() INTO updated_count;
    RAISE NOTICE 'Total de notes associées: %', updated_count;
END $$;

-- Étape 4: Vérifier le résultat
DO $$
DECLARE
    remaining_orphans INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_orphans FROM grades WHERE exam_id IS NULL;
    RAISE NOTICE 'Notes orphelines restantes: %', remaining_orphans;
END $$;

-- Étape 5: Ajouter une contrainte pour éviter les futures notes orphelines
-- (Optionnel - peut être activé plus tard si nécessaire)
-- ALTER TABLE grades ADD CONSTRAINT grades_exam_id_required 
-- CHECK (exam_id IS NOT NULL);

COMMENT ON FUNCTION associate_orphan_grades_to_exams() IS 
'Fonction pour associer automatiquement les notes orphelines (exam_id = null) aux examens appropriés basé sur le contexte (école, matière, date)';