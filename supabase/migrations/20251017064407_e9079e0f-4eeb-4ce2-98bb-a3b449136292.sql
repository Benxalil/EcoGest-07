-- 🚀 OPTIMISATION: Index pour améliorer les performances des requêtes fréquentes
-- Phase 3: Architecture - Gains estimés -100ms sur requêtes complexes

-- Index sur schedules pour filtrage par classe et jour (emploi du temps)
CREATE INDEX IF NOT EXISTS idx_schedules_class_day 
  ON schedules(class_id, day_of_week) 
  WHERE school_id IS NOT NULL;

-- Index sur students pour filtrage par école et statut actif
CREATE INDEX IF NOT EXISTS idx_students_school_active 
  ON students(school_id, is_active) 
  WHERE is_active = true;

-- Index sur grades pour filtrage par élève et semestre (résultats)
CREATE INDEX IF NOT EXISTS idx_grades_student_semester 
  ON grades(student_id, semester) 
  WHERE school_id IS NOT NULL;

-- Index sur announcements pour tri par date de publication
CREATE INDEX IF NOT EXISTS idx_announcements_published 
  ON announcements(school_id, published_at DESC) 
  WHERE is_published = true;

-- Index sur teacher_subjects pour lookup rapide des classes d'un enseignant
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher_school 
  ON teacher_subjects(teacher_id, school_id);

-- Index sur classes pour tri alphabétique
CREATE INDEX IF NOT EXISTS idx_classes_school_name 
  ON classes(school_id, name);

-- Index composite pour schedules avec teacher_id (requêtes enseignants)
CREATE INDEX IF NOT EXISTS idx_schedules_teacher_day 
  ON schedules(teacher_id, school_id, day_of_week) 
  WHERE teacher_id IS NOT NULL;

-- Index sur students pour recherche par parent
CREATE INDEX IF NOT EXISTS idx_students_parent_email 
  ON students(parent_email) 
  WHERE parent_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_students_parent_matricule 
  ON students(parent_matricule) 
  WHERE parent_matricule IS NOT NULL;

-- Analyser les tables pour mettre à jour les statistiques du query planner
ANALYZE schedules;
ANALYZE students;
ANALYZE grades;
ANALYZE announcements;
ANALYZE teacher_subjects;
ANALYZE classes;