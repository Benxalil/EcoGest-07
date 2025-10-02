-- Créer un index composite optimisé pour la requête student dashboard
-- Cet index permet de trouver rapidement un élève par user_id ET school_id
CREATE INDEX IF NOT EXISTS idx_students_user_school 
ON public.students (user_id, school_id) 
WHERE is_active = true;

-- Analyse de la table pour optimiser le query planner
ANALYZE public.students;