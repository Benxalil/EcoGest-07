-- Ajouter les champs de format de matricule dans la table schools
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS student_matricule_format TEXT DEFAULT 'ELEVE',
ADD COLUMN IF NOT EXISTS parent_matricule_format TEXT DEFAULT 'PAR',
ADD COLUMN IF NOT EXISTS default_student_password TEXT DEFAULT 'student123',
ADD COLUMN IF NOT EXISTS default_parent_password TEXT DEFAULT 'parent123',
ADD COLUMN IF NOT EXISTS auto_generate_student_matricule BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_generate_parent_matricule BOOLEAN DEFAULT true;

-- Commentaires pour documenter les champs
COMMENT ON COLUMN public.schools.student_matricule_format IS 'Format des matricules élèves (ex: ELEVE, E, STU)';
COMMENT ON COLUMN public.schools.parent_matricule_format IS 'Format des matricules parents (ex: PAR, P, PARENT)';
COMMENT ON COLUMN public.schools.default_student_password IS 'Mot de passe par défaut pour les nouveaux élèves';
COMMENT ON COLUMN public.schools.default_parent_password IS 'Mot de passe par défaut pour les nouveaux parents';
COMMENT ON COLUMN public.schools.auto_generate_student_matricule IS 'Générer automatiquement les matricules élèves';
COMMENT ON COLUMN public.schools.auto_generate_parent_matricule IS 'Générer automatiquement les matricules parents';