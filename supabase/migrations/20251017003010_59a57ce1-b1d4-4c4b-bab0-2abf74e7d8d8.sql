
-- ============================================
-- Migration: Synchronisation des formats de matricules
-- ============================================
-- Cette migration met à jour la fonction generate_user_matricule_v2 
-- pour utiliser les formats personnalisés depuis la table schools

-- Mise à jour de la fonction generate_user_matricule_v2
CREATE OR REPLACE FUNCTION public.generate_user_matricule_v2(school_id_param uuid, role_param user_role)
 RETURNS TABLE(matricule text, full_email text, format_used text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  role_prefix TEXT;
  user_number INTEGER;
  school_data RECORD;
  clean_suffix TEXT;
  result_matricule TEXT;
  result_email TEXT;
BEGIN
  -- Récupérer TOUS les paramètres de l'école (incluant teacher_matricule_format)
  SELECT 
    school_suffix,
    student_matricule_format,
    parent_matricule_format,
    teacher_matricule_format,
    default_student_password,
    default_parent_password,
    default_teacher_password
  INTO school_data
  FROM public.schools 
  WHERE id = school_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'School not found: %', school_id_param;
  END IF;
  
  -- Déterminer le préfixe en utilisant les formats personnalisés
  CASE role_param
    WHEN 'student' THEN 
      role_prefix := COALESCE(school_data.student_matricule_format, 'Eleve');
    WHEN 'teacher' THEN 
      role_prefix := COALESCE(school_data.teacher_matricule_format, 'Prof');
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
$function$;
