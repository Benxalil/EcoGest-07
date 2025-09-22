-- Créer la table pour les séries
CREATE TABLE IF NOT EXISTS public.series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur la table series
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour les séries
CREATE POLICY "School data access for series" 
ON public.series 
FOR ALL 
USING (school_id = get_user_school_id());

-- Créer la table pour les libellés de classe
CREATE TABLE IF NOT EXISTS public.class_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur la table class_labels
ALTER TABLE public.class_labels ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour les libellés
CREATE POLICY "School data access for class labels" 
ON public.class_labels 
FOR ALL 
USING (school_id = get_user_school_id());

-- Insérer les séries par défaut (pour toutes les écoles existantes)
INSERT INTO public.series (school_id, code, name, description) 
SELECT s.id, 'L', 'Littérature', 'Littérature et sciences humaines' FROM public.schools s
ON CONFLICT DO NOTHING;

INSERT INTO public.series (school_id, code, name, description) 
SELECT s.id, 'S', 'Scientifique', 'Scientifiques' FROM public.schools s
ON CONFLICT DO NOTHING;

INSERT INTO public.series (school_id, code, name, description) 
SELECT s.id, 'T', 'Technique', 'Techniques industrielles' FROM public.schools s
ON CONFLICT DO NOTHING;

INSERT INTO public.series (school_id, code, name, description) 
SELECT s.id, 'G', 'Gestion', 'Gestion' FROM public.schools s
ON CONFLICT DO NOTHING;

-- Insérer les libellés par défaut (pour toutes les écoles existantes)
INSERT INTO public.class_labels (school_id, label) 
SELECT s.id, 'A' FROM public.schools s
ON CONFLICT DO NOTHING;

INSERT INTO public.class_labels (school_id, label) 
SELECT s.id, 'B' FROM public.schools s
ON CONFLICT DO NOTHING;

INSERT INTO public.class_labels (school_id, label) 
SELECT s.id, 'C' FROM public.schools s
ON CONFLICT DO NOTHING;

INSERT INTO public.class_labels (school_id, label) 
SELECT s.id, 'D' FROM public.schools s
ON CONFLICT DO NOTHING;

INSERT INTO public.class_labels (school_id, label) 
SELECT s.id, 'E' FROM public.schools s
ON CONFLICT DO NOTHING;