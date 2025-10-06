-- Migration pour corriger les examens de Composition sans semester
-- Cette migration met à jour la colonne semester des examens de Composition

-- Méthode 1 : Détecter le semestre depuis le titre de l'examen
UPDATE exams 
SET semester = CASE
  WHEN title ~* '1er|premier|first' THEN 'semestre1'
  WHEN title ~* '2[eè]me|deuxi[eè]me|second' THEN 'semestre2'
  ELSE NULL
END
WHERE title ILIKE '%composition%' 
  AND semester IS NULL;

-- Méthode 2 : Extraire le semestre depuis les grades associées (pour les examens sans indication dans le titre)
UPDATE exams e
SET semester = (
  SELECT DISTINCT g.semester 
  FROM grades g 
  WHERE g.exam_id = e.id 
    AND g.semester IS NOT NULL
  LIMIT 1
)
WHERE e.title ILIKE '%composition%'
  AND e.semester IS NULL
  AND EXISTS (
    SELECT 1 FROM grades g 
    WHERE g.exam_id = e.id 
      AND g.semester IS NOT NULL
  );

-- Vérification : Afficher les examens de Composition avec leur semester
SELECT 
  id,
  title,
  semester,
  exam_date,
  (SELECT COUNT(*) FROM grades WHERE exam_id = exams.id) as nb_grades
FROM exams 
WHERE title ILIKE '%composition%'
ORDER BY exam_date DESC;