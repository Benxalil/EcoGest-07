-- Update the generate_user_identifier function to use valid email format
CREATE OR REPLACE FUNCTION public.generate_user_identifier(school_id_param uuid, role_param user_role, school_suffix_param text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  role_prefix text;
  user_number integer;
  school_suffix text;
  clean_suffix text;
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
  
  -- Nettoyer le suffixe pour le format email (remplacer underscore par tiret)
  clean_suffix := replace(school_suffix, '_', '-');
  
  -- Générer le numéro séquentiel pour ce rôle dans cette école
  user_number := get_next_user_identifier_number(school_id_param, role_param);
  
  -- Formatter avec le nouveau domaine ecogest.app
  final_identifier := role_prefix || lpad(user_number::text, 3, '0') || '@' || clean_suffix || '.ecogest.app';
  
  RETURN final_identifier;
END;
$function$;