-- Étape 1 & 3: Améliorer le trigger avec logs et recréer avec approche robuste

-- D'abord, supprimer l'ancien trigger et fonction s'ils existent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Créer une nouvelle fonction avec logs détaillés et gestion d'erreur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log de début
  RAISE LOG 'handle_new_user: Starting profile creation for user %', NEW.id;
  
  BEGIN
    -- Insertion du profil avec gestion d'erreur
    INSERT INTO public.profiles (
      id, 
      first_name, 
      last_name, 
      email, 
      role,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'User'),
      COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
      NEW.email,
      COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student'),
      NOW(),
      NOW()
    );
    
    -- Log de succès
    RAISE LOG 'handle_new_user: Profile created successfully for user % with email %', NEW.id, NEW.email;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log d'erreur détaillé
    RAISE LOG 'handle_new_user: ERROR creating profile for user %. SQLSTATE: %, SQLERRM: %', NEW.id, SQLSTATE, SQLERRM;
    -- Re-lancer l'exception pour arrêter la transaction si nécessaire
    RAISE;
  END;
  
  RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Log pour confirmer la création
SELECT 'Trigger recreated successfully' as status;