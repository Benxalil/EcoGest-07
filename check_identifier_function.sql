-- Vérifier si la fonction generate_user_identifier existe
SELECT 'Vérification de la fonction generate_user_identifier:' as test;

-- Vérifier si la fonction existe
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'generate_user_identifier';

-- Si elle n'existe pas, la créer
CREATE OR REPLACE FUNCTION public.generate_user_identifier(
  school_id_param UUID,
  role_param TEXT,
  school_suffix_param TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  identifier TEXT;
  school_suffix TEXT;
BEGIN
  -- Utiliser le suffixe fourni ou générer un par défaut
  school_suffix := COALESCE(school_suffix_param, 'SCH');
  
  -- Obtenir le prochain numéro pour ce rôle dans cette école
  INSERT INTO public.school_user_counters (school_id, user_role, current_count)
  VALUES (school_id_param, role_param::user_role, 1)
  ON CONFLICT (school_id, user_role) 
  DO UPDATE SET 
    current_count = school_user_counters.current_count + 1,
    updated_at = NOW()
  RETURNING current_count INTO next_number;
  
  -- Générer l'identifiant selon le rôle
  CASE role_param
    WHEN 'student' THEN
      identifier := 'ELEVE' || LPAD(next_number::TEXT, 3, '0');
    WHEN 'teacher' THEN
      identifier := 'PROF' || LPAD(next_number::TEXT, 3, '0');
    WHEN 'admin' THEN
      identifier := 'ADMIN' || LPAD(next_number::TEXT, 3, '0');
    ELSE
      identifier := UPPER(role_param) || LPAD(next_number::TEXT, 3, '0');
  END CASE;
  
  -- Ajouter le suffixe de l'école si fourni
  IF school_suffix IS NOT NULL THEN
    identifier := school_suffix || '_' || identifier;
  END IF;
  
  RETURN identifier;
END;
$$;

-- Vérifier que la fonction a été créée
SELECT 'Fonction generate_user_identifier créée:' as test,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'generate_user_identifier') 
            THEN 'OUI' ELSE 'NON' END as result;

-- Tester la fonction
SELECT 'Test de la fonction:' as test;
SELECT public.generate_user_identifier(
  (SELECT id FROM public.schools LIMIT 1),
  'teacher',
  'TEST'
) as test_identifier;


