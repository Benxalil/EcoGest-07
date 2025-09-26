-- Ajouter le champ updated_at à la table schedules s'il n'existe pas
ALTER TABLE public.schedules 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Mettre à jour tous les enregistrements existants qui n'ont pas updated_at
UPDATE public.schedules 
SET updated_at = created_at 
WHERE updated_at IS NULL;