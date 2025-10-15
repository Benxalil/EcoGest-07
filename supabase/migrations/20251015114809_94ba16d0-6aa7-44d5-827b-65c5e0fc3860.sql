-- Ajouter des colonnes pour stocker les mots de passe en clair dans les tables students et teachers
-- Note: Ceci est pour permettre aux administrateurs de voir les mots de passe des utilisateurs

-- Ajouter le champ password à la table students
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS password text;

-- Ajouter le champ password à la table teachers  
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS password text;

-- Commentaires pour documentation
COMMENT ON COLUMN public.students.password IS 'Mot de passe en clair pour permettre aux administrateurs de le communiquer aux élèves/parents';
COMMENT ON COLUMN public.teachers.password IS 'Mot de passe en clair pour permettre aux administrateurs de le communiquer aux enseignants';