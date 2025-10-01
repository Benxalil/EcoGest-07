-- Migration des notes de l'examen dupliqué vers le bon examen
-- Examen source (à supprimer): d844865c-b9d6-486d-8fa7-fb2b7309cace
-- Examen cible (à garder): b07d0ffb-1ee8-4a66-97de-a6b16d5093da

-- Étape 1: Migrer toutes les notes vers le bon examen
UPDATE grades
SET exam_id = 'b07d0ffb-1ee8-4a66-97de-a6b16d5093da',
    updated_at = NOW()
WHERE exam_id = 'd844865c-b9d6-486d-8fa7-fb2b7309cace';

-- Étape 2: Supprimer l'examen vide (doublon)
DELETE FROM exams
WHERE id = 'd844865c-b9d6-486d-8fa7-fb2b7309cace';

-- Vérification: Compter les notes migrées
SELECT 
    'Notes migrées avec succès' as message,
    COUNT(*) as nombre_de_notes
FROM grades
WHERE exam_id = 'b07d0ffb-1ee8-4a66-97de-a6b16d5093da';