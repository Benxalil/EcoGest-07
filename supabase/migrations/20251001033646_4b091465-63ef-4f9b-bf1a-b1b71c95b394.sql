-- Créer la fonction get_user_school_id si elle n'existe pas
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Mettre à jour les parent_matricule manquants pour les élèves existants
UPDATE students
SET parent_matricule = REPLACE(REPLACE(student_number, 'ELEVE', 'PARENT'), 'Eleve', 'Parent')
WHERE parent_matricule IS NULL OR parent_matricule = '';