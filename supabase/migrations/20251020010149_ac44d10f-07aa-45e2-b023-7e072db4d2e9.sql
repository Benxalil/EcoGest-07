-- Ajouter le champ pro_compatible pour suivre si l'école peut encore choisir le plan Pro
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS pro_compatible BOOLEAN NOT NULL DEFAULT true;

-- Ajouter un commentaire pour expliquer le champ
COMMENT ON COLUMN public.schools.pro_compatible IS 'Indique si l''école peut encore choisir le plan Pro (false si les limites Pro ont été dépassées pendant l''essai)';

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_schools_pro_compatible ON public.schools(pro_compatible);