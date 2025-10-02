-- Ajouter les colonnes pour stocker le nom réel du parent
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS parent_first_name TEXT,
ADD COLUMN IF NOT EXISTS parent_last_name TEXT;

-- Ajouter un commentaire pour documenter ces colonnes
COMMENT ON COLUMN public.students.parent_first_name IS 'Prénom réel du parent/tuteur';
COMMENT ON COLUMN public.students.parent_last_name IS 'Nom réel du parent/tuteur';