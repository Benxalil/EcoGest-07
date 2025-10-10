-- ============================================
-- CORRECTION 1: Unicité du matricule d'école
-- ============================================

-- Ajouter une contrainte UNIQUE sur school_suffix
ALTER TABLE public.schools 
ADD CONSTRAINT schools_school_suffix_unique UNIQUE (school_suffix);

-- ============================================
-- CORRECTION 2: Compteur continu et incrémental
-- ============================================

-- Fonction pour obtenir le prochain numéro basé sur les utilisateurs existants
CREATE OR REPLACE FUNCTION public.get_next_user_number_continuous(
  school_id_param UUID,
  role_param user_role
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_existing_number INTEGER := 0;
  counter_value INTEGER := 0;
  next_number INTEGER;
BEGIN
  -- Compter les utilisateurs existants de ce rôle dans cette école
  -- en extrayant le numéro depuis l'email (format: PrefixeXXX@...)
  CASE role_param
    WHEN 'student' THEN
      SELECT COALESCE(MAX(
        CAST(
          SUBSTRING(
            SPLIT_PART(email, '@', 1) 
            FROM '[0-9]+$'
          ) AS INTEGER
        )
      ), 0) INTO max_existing_number
      FROM profiles
      WHERE school_id = school_id_param 
        AND role = 'student'
        AND email ~ '[0-9]+@';
        
    WHEN 'teacher' THEN
      SELECT COALESCE(MAX(
        CAST(
          SUBSTRING(
            SPLIT_PART(email, '@', 1) 
            FROM '[0-9]+$'
          ) AS INTEGER
        )
      ), 0) INTO max_existing_number
      FROM profiles
      WHERE school_id = school_id_param 
        AND role = 'teacher'
        AND email ~ '[0-9]+@';
        
    WHEN 'parent' THEN
      SELECT COALESCE(MAX(
        CAST(
          SUBSTRING(
            SPLIT_PART(email, '@', 1) 
            FROM '[0-9]+$'
          ) AS INTEGER
        )
      ), 0) INTO max_existing_number
      FROM profiles
      WHERE school_id = school_id_param 
        AND role = 'parent'
        AND email ~ '[0-9]+@';
        
    WHEN 'school_admin' THEN
      SELECT COALESCE(MAX(
        CAST(
          SUBSTRING(
            SPLIT_PART(email, '@', 1) 
            FROM '[0-9]+$'
          ) AS INTEGER
        )
      ), 0) INTO max_existing_number
      FROM profiles
      WHERE school_id = school_id_param 
        AND role = 'school_admin'
        AND email ~ '[0-9]+@';
  END CASE;
  
  -- Obtenir la valeur actuelle du compteur
  SELECT COALESCE(current_count, 0) INTO counter_value
  FROM public.school_user_counters
  WHERE school_id = school_id_param 
    AND user_role = role_param;
  
  -- Le prochain numéro est le MAX entre le compteur et les utilisateurs existants + 1
  next_number := GREATEST(max_existing_number, counter_value) + 1;
  
  -- Mettre à jour le compteur avec la nouvelle valeur
  INSERT INTO public.school_user_counters (school_id, user_role, current_count)
  VALUES (school_id_param, role_param, next_number)
  ON CONFLICT (school_id, user_role)
  DO UPDATE SET 
    current_count = next_number,
    updated_at = NOW();
  
  RETURN next_number;
END;
$$;

-- Fonction modifiée pour générer les identifiants avec numéro continu
CREATE OR REPLACE FUNCTION public.generate_user_identifier(
  school_id_param UUID,
  role_param user_role,
  school_suffix_param TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_prefix TEXT;
  user_number INTEGER;
  school_suffix TEXT;
  clean_suffix TEXT;
  final_identifier TEXT;
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
  
  -- Nettoyer le suffixe pour le format email (remplacer underscore par tiret)
  clean_suffix := REPLACE(school_suffix, '_', '-');
  
  -- Obtenir le prochain numéro continu (basé sur MAX existants)
  user_number := get_next_user_number_continuous(school_id_param, role_param);
  
  -- Formatter avec le nouveau domaine ecogest.app
  final_identifier := role_prefix || LPAD(user_number::TEXT, 3, '0') || '@' || clean_suffix || '.ecogest.app';
  
  RETURN final_identifier;
END;
$$;

-- Commentaires pour documentation
COMMENT ON FUNCTION public.get_next_user_number_continuous IS 
'Calcule le prochain numéro séquentiel pour un rôle donné en analysant les utilisateurs existants. Garantit la continuité même si le format de matricule change.';

COMMENT ON CONSTRAINT schools_school_suffix_unique ON public.schools IS 
'Garantit l''unicité du matricule d''école au niveau système pour éviter les conflits de connexion entre écoles.';