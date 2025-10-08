-- Correction de la politique RLS pour permettre aux créateurs de voir leur école
-- Le problème : après l'insertion, le .select() échoue car l'utilisateur n'a pas encore de school_id dans son profil

-- Supprimer l'ancienne politique SELECT restrictive
DROP POLICY IF EXISTS "Users can view their school data" ON public.schools;

-- Créer une nouvelle politique SELECT qui permet :
-- 1. Aux utilisateurs de voir l'école liée à leur profil (school_id)
-- 2. Aux créateurs de voir l'école qu'ils ont créée (created_by)
CREATE POLICY "Users can view their school or created school" 
ON public.schools 
FOR SELECT 
USING (
  -- L'école est liée au profil de l'utilisateur
  id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  OR
  -- L'utilisateur a créé cette école
  created_by = auth.uid()
);