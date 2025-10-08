-- Amélioration de la fonction d'initialisation pour inclure séries et libellés par défaut
-- Cela garantit que chaque nouvelle école a automatiquement accès aux séries et libellés standards

CREATE OR REPLACE FUNCTION public.initialize_new_school(
  school_id_param uuid,
  school_type_param school_type DEFAULT 'public'::school_type,
  academic_year_name_param text DEFAULT '2024/2025'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  school_name_var text;
  generated_suffix text;
BEGIN
  -- Récupérer le nom de l'école
  SELECT name INTO school_name_var 
  FROM public.schools 
  WHERE id = school_id_param;
  
  -- Générer et assigner le suffixe unique
  generated_suffix := generate_school_suffix(school_name_var);
  
  UPDATE public.schools 
  SET school_suffix = generated_suffix 
  WHERE id = school_id_param;

  -- NOUVEAU : Copier les séries par défaut pour cette école
  INSERT INTO public.series (school_id, code, name, description)
  SELECT 
    school_id_param,
    code,
    name,
    description
  FROM public.default_series
  WHERE is_active = true;

  -- NOUVEAU : Copier les libellés par défaut pour cette école
  INSERT INTO public.class_labels (school_id, label)
  SELECT 
    school_id_param,
    name
  FROM public.default_labels
  WHERE is_active = true;

  -- Créer les matières de base selon le type d'école
  IF school_type_param = 'primary' THEN
    INSERT INTO public.subjects (school_id, name, code, coefficient, color) VALUES
    (school_id_param, 'Français', 'FR', 4, '#FF6B6B'),
    (school_id_param, 'Mathématiques', 'MATH', 4, '#4ECDC4'),
    (school_id_param, 'Sciences', 'SCI', 2, '#45B7D1'),
    (school_id_param, 'Histoire-Géographie', 'HG', 2, '#FFA07A'),
    (school_id_param, 'Éducation Physique', 'EPS', 1, '#98D8C8');
  ELSIF school_type_param = 'secondary' THEN
    INSERT INTO public.subjects (school_id, name, code, coefficient, color) VALUES
    (school_id_param, 'Français', 'FR', 4, '#FF6B6B'),
    (school_id_param, 'Mathématiques', 'MATH', 4, '#4ECDC4'),
    (school_id_param, 'Physique-Chimie', 'PC', 3, '#45B7D1'),
    (school_id_param, 'SVT', 'SVT', 2, '#95E1A3'),
    (school_id_param, 'Histoire-Géographie', 'HG', 3, '#FFA07A'),
    (school_id_param, 'Anglais', 'ANG', 3, '#F7DC6F'),
    (school_id_param, 'Philosophie', 'PHILO', 3, '#BB8FCE'),
    (school_id_param, 'Éducation Physique', 'EPS', 1, '#98D8C8');
  ELSE
    -- École publique générale - matières mixtes
    INSERT INTO public.subjects (school_id, name, code, coefficient, color) VALUES
    (school_id_param, 'Français', 'FR', 4, '#FF6B6B'),
    (school_id_param, 'Mathématiques', 'MATH', 4, '#4ECDC4'),
    (school_id_param, 'Sciences', 'SCI', 2, '#45B7D1'),
    (school_id_param, 'Histoire-Géographie', 'HG', 2, '#FFA07A'),
    (school_id_param, 'Anglais', 'ANG', 2, '#F7DC6F'),
    (school_id_param, 'Éducation Physique', 'EPS', 1, '#98D8C8');
  END IF;

  -- Créer les catégories de paiement de base
  INSERT INTO public.payment_categories (school_id, name, description, amount, is_recurring) VALUES
  (school_id_param, 'Frais de scolarité', 'Frais de scolarité mensuel', 50000, true),
  (school_id_param, 'Frais d''inscription', 'Frais d''inscription annuel', 25000, false),
  (school_id_param, 'Frais de transport', 'Frais de transport mensuel', 10000, true);

END;
$$;