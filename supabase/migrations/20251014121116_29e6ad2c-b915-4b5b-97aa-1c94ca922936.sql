-- Ajouter les champs pour les paramètres des enseignants dans la table schools
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS teacher_matricule_format TEXT DEFAULT 'PROF',
ADD COLUMN IF NOT EXISTS default_teacher_password TEXT DEFAULT 'teacher123',
ADD COLUMN IF NOT EXISTS auto_generate_teacher_matricule BOOLEAN DEFAULT true;