-- Associer les notes orphelines en créant des examens si nécessaire
DO $$
DECLARE
    grade_record RECORD;
    target_exam_id UUID;
    updated_count INTEGER := 0;
    school_id_val UUID := '0adfd464-9161-4552-92ba-419cf8bb3199';
BEGIN
    -- Parcourir toutes les notes orphelines de cette école
    FOR grade_record IN 
        SELECT g.id, g.student_id, g.subject_id, g.exam_type, g.created_at, g.school_id,
               s.class_id, s.name as subject_name
        FROM grades g 
        JOIN students st ON g.student_id = st.id
        JOIN subjects s ON g.subject_id = s.id
        WHERE g.exam_id IS NULL AND g.school_id = school_id_val
        ORDER BY g.created_at DESC
    LOOP
        -- Essayer de trouver un examen correspondant
        SELECT e.id INTO target_exam_id
        FROM exams e
        WHERE e.school_id = grade_record.school_id
          AND e.class_id = grade_record.class_id
        ORDER BY ABS(EXTRACT(EPOCH FROM (e.created_at - grade_record.created_at)))
        LIMIT 1;
        
        -- Si aucun examen n'est trouvé, en créer un
        IF target_exam_id IS NULL THEN
            INSERT INTO exams (
                school_id, 
                class_id, 
                title, 
                description, 
                exam_date, 
                is_published
            ) VALUES (
                grade_record.school_id,
                grade_record.class_id,
                'Examen ' || grade_record.exam_type,
                'Examen automatiquement créé pour les notes existantes',
                CURRENT_DATE,
                true
            ) RETURNING id INTO target_exam_id;
            
            RAISE NOTICE 'Nouvel examen créé: %', target_exam_id;
        END IF;
        
        -- Associer la note à cet examen
        UPDATE grades 
        SET exam_id = target_exam_id,
            updated_at = NOW()
        WHERE id = grade_record.id;
        
        updated_count := updated_count + 1;
        
        RAISE NOTICE 'Note % associée à l''examen %', grade_record.id, target_exam_id;
    END LOOP;
    
    RAISE NOTICE 'Total de % notes associées', updated_count;
END $$;