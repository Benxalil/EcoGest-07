
-- Créer des index pour optimiser les requêtes sur schedules
-- Ces index vont accélérer les requêtes par teacher_id, school_id, et les jointures

-- Index composite pour les requêtes teacher + school (le cas le plus fréquent)
CREATE INDEX IF NOT EXISTS idx_schedules_teacher_school 
ON public.schedules (teacher_id, school_id) 
WHERE teacher_id IS NOT NULL;

-- Index pour les jointures avec classes
CREATE INDEX IF NOT EXISTS idx_schedules_class_id 
ON public.schedules (class_id);

-- Index pour les requêtes par school_id seul
CREATE INDEX IF NOT EXISTS idx_schedules_school_id 
ON public.schedules (school_id);

-- Index pour filtrer par day_of_week (utilisé pour les emplois du temps du jour)
CREATE INDEX IF NOT EXISTS idx_schedules_day_of_week 
ON public.schedules (day_of_week);

-- Index composite pour les requêtes class + day (pour afficher l'EDT d'une classe)
CREATE INDEX IF NOT EXISTS idx_schedules_class_day 
ON public.schedules (class_id, day_of_week);

-- Analyser la table pour mettre à jour les statistiques
ANALYZE public.schedules;
