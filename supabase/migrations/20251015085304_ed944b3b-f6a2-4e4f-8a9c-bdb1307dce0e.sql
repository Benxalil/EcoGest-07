-- Corriger les notes mal associées : transférer les notes de l'examen 4ème vers l'examen CI
-- Car les élèves appartiennent à la classe CI mais leurs notes sont sur l'examen de 4ème

-- Mise à jour des notes pour pointer vers le bon examen
UPDATE grades
SET exam_id = '9119566f-280b-4183-8bbb-60d4ee30e6ff',
    updated_at = NOW()
WHERE exam_id = '86d6e648-1bd1-42da-bac8-a023ac6cd705'
  AND student_id IN (
    SELECT id FROM students 
    WHERE class_id = '49632d55-95fd-4fce-879a-9817cfa1fc72'
  );

-- Publier l'examen CI maintenant qu'il a des notes
UPDATE exams
SET is_published = true,
    updated_at = NOW()
WHERE id = '9119566f-280b-4183-8bbb-60d4ee30e6ff';

-- Log de la correction
DO $$
BEGIN
  RAISE NOTICE 'Notes transférées de l''examen 4ème vers l''examen CI';
  RAISE NOTICE 'Examen CI publié automatiquement';
END $$;