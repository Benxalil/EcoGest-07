-- Mise en place du système d'identifiants unique par école

-- 1. Ajouter un champ school_suffix à la table schools
ALTER TABLE public.schools 
ADD COLUMN school_suffix text UNIQUE;

-- 2. Créer une table pour gérer les compteurs d'identifiants par école et rôle
CREATE TABLE public.school_user_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_role user_role NOT NULL,
  current_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(school_id, user_role)
);

-- Enable RLS on the counters table
ALTER TABLE public.school_user_counters ENABLE ROW LEVEL SECURITY;

-- RLS policy for school_user_counters
CREATE POLICY "School data access for counters" 
ON public.school_user_counters 
FOR ALL 
USING (school_id = get_user_school_id());

-- 3. Fonction pour générer un suffixe d'école unique
CREATE OR REPLACE FUNCTION public.generate_school_suffix(school_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_suffix text;
  final_suffix text;
  counter integer := 1;
  suffix_exists boolean;
BEGIN
  -- Nettoyer le nom de l'école : supprimer les caractères spéciaux et remplacer les espaces par des underscores
  base_suffix := regexp_replace(
    regexp_replace(
      regexp_replace(lower(school_name), '[^a-z0-9\s]', '', 'g'), -- supprimer caractères spéciaux
      '\s+', '_', 'g' -- remplacer espaces par underscores
    ),
    '_+', '_', 'g' -- éviter les underscores multiples
  );
  
  -- Limiter à 20 caractères pour éviter des suffixes trop longs
  base_suffix := left(base_suffix, 20);
  
  -- Supprimer les underscores en début et fin
  base_suffix := trim(base_suffix, '_');
  
  -- Vérifier l'unicité et ajouter un numéro si nécessaire
  final_suffix := base_suffix;
  
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.schools WHERE school_suffix = final_suffix) INTO suffix_exists;
    
    IF NOT suffix_exists THEN
      EXIT; -- Suffixe unique trouvé
    END IF;
    
    final_suffix := base_suffix || '_' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_suffix;
END;
$$;

-- 4. Fonction pour obtenir le prochain numéro d'identifiant pour un rôle dans une école
CREATE OR REPLACE FUNCTION public.get_next_user_identifier_number(
  school_id_param uuid,
  role_param user_role
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number integer;
BEGIN
  -- Insérer ou mettre à jour le compteur pour cette école et ce rôle
  INSERT INTO public.school_user_counters (school_id, user_role, current_count)
  VALUES (school_id_param, role_param, 1)
  ON CONFLICT (school_id, user_role)
  DO UPDATE SET 
    current_count = school_user_counters.current_count + 1,
    updated_at = now()
  RETURNING current_count INTO next_number;
  
  RETURN next_number;
END;
$$;

-- 5. Fonction pour générer un identifiant utilisateur complet
CREATE OR REPLACE FUNCTION public.generate_user_identifier(
  school_id_param uuid,
  role_param user_role,
  school_suffix_param text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_prefix text;
  user_number integer;
  school_suffix text;
  final_identifier text;
BEGIN
  -- Déterminer le préfixe selon le rôle
  CASE role_param
    WHEN 'student' THEN role_prefix := 'Eleve';
    WHEN 'teacher' THEN role_prefix := 'Prof';
    WHEN 'parent' THEN role_prefix := 'Parent';
    WHEN 'school_admin' THEN role_prefix := 'Admin';
    ELSE role_prefix := 'User';
  END CASE;
  
  -- Récupérer le suffixe de l'école si pas fourni
  IF school_suffix_param IS NULL THEN
    SELECT s.school_suffix INTO school_suffix 
    FROM public.schools s 
    WHERE s.id = school_id_param;
  ELSE
    school_suffix := school_suffix_param;
  END IF;
  
  -- Générer le numéro séquentiel pour ce rôle dans cette école
  user_number := get_next_user_identifier_number(school_id_param, role_param);
  
  -- Formatter le numéro avec des zéros (3 chiffres)
  final_identifier := role_prefix || lpad(user_number::text, 3, '0') || '@' || school_suffix;
  
  RETURN final_identifier;
END;
$$;

-- 6. Mettre à jour la fonction initialize_new_school pour générer et assigner le suffixe
CREATE OR REPLACE FUNCTION public.initialize_new_school(
  school_id_param uuid,
  school_type_param school_type DEFAULT 'public',
  academic_year_name_param text DEFAULT '2024/2025'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Créer l'année académique par défaut
  INSERT INTO public.academic_years (
    school_id,
    name,
    start_date,
    end_date,
    is_current
  ) VALUES (
    school_id_param,
    academic_year_name_param,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '12 months',
    true
  );

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

-- 7. Trigger pour mettre à jour les timestamps automatiquement
CREATE TRIGGER update_school_user_counters_updated_at
  BEFORE UPDATE ON public.school_user_counters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();