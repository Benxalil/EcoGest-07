-- Phase 1: Centraliser la génération des matricules avec contraintes par école

-- ====================================================================
-- Fonction 1: get_next_user_number_from_all_sources
-- Cherche le prochain numéro disponible dans TOUTES les sources
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_next_user_number_from_all_sources(
  school_id_param UUID,
  role_param user_role,
  prefix_pattern TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_from_profiles INTEGER := 0;
  max_from_students INTEGER := 0;
  max_from_teachers INTEGER := 0;
  max_number INTEGER := 0;
  next_number INTEGER;
BEGIN
  -- Chercher dans profiles.email (comptes auth)
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(
        SPLIT_PART(email, '@', 1) 
        FROM '[0-9]+$'
      ) AS INTEGER
    )
  ), 0) INTO max_from_profiles
  FROM profiles
  WHERE school_id = school_id_param 
    AND role = role_param
    AND email ~ (prefix_pattern || '[0-9]+@');
  
  -- Chercher dans students.student_number (élèves sans compte)
  IF role_param = 'student' THEN
    SELECT COALESCE(MAX(
      CAST(
        REGEXP_REPLACE(student_number, '[^0-9]', '', 'g') AS INTEGER
      )
    ), 0) INTO max_from_students
    FROM students
    WHERE school_id = school_id_param 
      AND student_number ~ (prefix_pattern || '[0-9]+');
  END IF;
  
  -- Chercher dans teachers.employee_number (enseignants sans compte)
  IF role_param = 'teacher' THEN
    SELECT COALESCE(MAX(
      CAST(
        REGEXP_REPLACE(employee_number, '[^0-9]', '', 'g') AS INTEGER
      )
    ), 0) INTO max_from_teachers
    FROM teachers
    WHERE school_id = school_id_param 
      AND employee_number ~ (prefix_pattern || '[0-9]+');
  END IF;
  
  -- Prendre le MAX de toutes les sources
  max_number := GREATEST(max_from_profiles, max_from_students, max_from_teachers);
  
  -- Ajouter 1 pour obtenir le prochain numéro
  next_number := max_number + 1;
  
  -- Enregistrer dans school_user_counters pour audit
  INSERT INTO public.school_user_counters (school_id, user_role, current_count)
  VALUES (school_id_param, role_param, next_number)
  ON CONFLICT (school_id, user_role)
  DO UPDATE SET 
    current_count = GREATEST(school_user_counters.current_count, next_number),
    updated_at = NOW();
  
  RETURN next_number;
END;
$$;

-- ====================================================================
-- Fonction 2: generate_user_matricule_v2
-- Génère un matricule complet en utilisant les paramètres de l'école
-- ====================================================================
CREATE OR REPLACE FUNCTION public.generate_user_matricule_v2(
  school_id_param UUID,
  role_param user_role
)
RETURNS TABLE (
  matricule TEXT,
  full_email TEXT,
  format_used TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_prefix TEXT;
  user_number INTEGER;
  school_data RECORD;
  clean_suffix TEXT;
BEGIN
  -- Récupérer les paramètres de l'école (préfixes personnalisés)
  SELECT 
    school_suffix,
    student_matricule_format,
    parent_matricule_format
  INTO school_data
  FROM public.schools 
  WHERE id = school_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'School not found: %', school_id_param;
  END IF;
  
  -- Déterminer le préfixe selon le rôle ET les paramètres de l'école
  CASE role_param
    WHEN 'student' THEN 
      role_prefix := COALESCE(school_data.student_matricule_format, 'Eleve');
    WHEN 'teacher' THEN 
      role_prefix := 'Prof';
    WHEN 'parent' THEN 
      role_prefix := COALESCE(school_data.parent_matricule_format, 'Parent');
    WHEN 'school_admin' THEN 
      role_prefix := 'Admin';
    ELSE 
      RAISE EXCEPTION 'Invalid role: %', role_param;
  END CASE;
  
  -- Obtenir le prochain numéro en cherchant dans TOUTES les sources
  user_number := get_next_user_number_from_all_sources(school_id_param, role_param, role_prefix);
  
  -- Nettoyer le suffixe pour le format email
  clean_suffix := REPLACE(school_data.school_suffix, '_', '-');
  
  -- Construire le matricule simple (ex: Eleve005)
  matricule := role_prefix || LPAD(user_number::TEXT, 3, '0');
  
  -- Construire l'email complet (ex: Eleve005@ecole-best.ecogest.app)
  full_email := matricule || '@' || clean_suffix || '.ecogest.app';
  
  -- Retourner toutes les informations
  format_used := role_prefix;
  
  RETURN QUERY SELECT matricule, full_email, format_used;
END;
$$;

-- ====================================================================
-- Contraintes UNIQUE pour empêcher les doublons PAR ÉCOLE
-- ====================================================================

-- Contrainte pour students: (school_id, student_number) doit être unique
-- Deux élèves d'écoles différentes peuvent avoir le même matricule
ALTER TABLE public.students 
DROP CONSTRAINT IF EXISTS students_school_student_number_unique;

ALTER TABLE public.students 
ADD CONSTRAINT students_school_student_number_unique 
UNIQUE (school_id, student_number);

-- Contrainte pour teachers: (school_id, employee_number) doit être unique
ALTER TABLE public.teachers 
DROP CONSTRAINT IF EXISTS teachers_school_employee_number_unique;

ALTER TABLE public.teachers 
ADD CONSTRAINT teachers_school_employee_number_unique 
UNIQUE (school_id, employee_number);

-- Note: profiles.email est déjà UNIQUE globalement (géré par Supabase Auth)
-- Mais comme l'email contient le school_suffix, il n'y aura pas de collision

-- ====================================================================
-- Table d'audit pour la génération de matricules
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.matricule_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  user_id UUID REFERENCES auth.users(id),
  role user_role NOT NULL,
  generated_matricule TEXT NOT NULL,
  generated_email TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'rpc_v2'
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_matricule_log_school 
ON matricule_generation_log(school_id, timestamp DESC);

-- RLS pour la table de log
ALTER TABLE public.matricule_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can view matricule logs"
ON public.matricule_generation_log FOR SELECT
USING (
  school_id IN (
    SELECT school_id FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'school_admin'
  )
);

-- ====================================================================
-- Mise à jour de la fonction pour inclure le logging
-- ====================================================================
CREATE OR REPLACE FUNCTION public.generate_user_matricule_v2(
  school_id_param UUID,
  role_param user_role
)
RETURNS TABLE (
  matricule TEXT,
  full_email TEXT,
  format_used TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_prefix TEXT;
  user_number INTEGER;
  school_data RECORD;
  clean_suffix TEXT;
  result_matricule TEXT;
  result_email TEXT;
BEGIN
  -- Récupérer les paramètres de l'école
  SELECT 
    school_suffix,
    student_matricule_format,
    parent_matricule_format
  INTO school_data
  FROM public.schools 
  WHERE id = school_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'School not found: %', school_id_param;
  END IF;
  
  -- Déterminer le préfixe
  CASE role_param
    WHEN 'student' THEN 
      role_prefix := COALESCE(school_data.student_matricule_format, 'Eleve');
    WHEN 'teacher' THEN 
      role_prefix := 'Prof';
    WHEN 'parent' THEN 
      role_prefix := COALESCE(school_data.parent_matricule_format, 'Parent');
    WHEN 'school_admin' THEN 
      role_prefix := 'Admin';
    ELSE 
      RAISE EXCEPTION 'Invalid role: %', role_param;
  END CASE;
  
  -- Obtenir le prochain numéro
  user_number := get_next_user_number_from_all_sources(school_id_param, role_param, role_prefix);
  
  -- Construire les résultats
  clean_suffix := REPLACE(school_data.school_suffix, '_', '-');
  result_matricule := role_prefix || LPAD(user_number::TEXT, 3, '0');
  result_email := result_matricule || '@' || clean_suffix || '.ecogest.app';
  
  -- Logger la génération
  INSERT INTO matricule_generation_log (
    school_id, 
    user_id, 
    role, 
    generated_matricule,
    generated_email
  ) VALUES (
    school_id_param,
    auth.uid(),
    role_param,
    result_matricule,
    result_email
  );
  
  -- Retourner les résultats
  RETURN QUERY SELECT result_matricule, result_email, role_prefix;
END;
$$;