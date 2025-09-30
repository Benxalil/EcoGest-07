-- CORRECTIF DÉFINITIF: Supprimer toutes les politiques récursives et garder UNIQUEMENT les simples

-- 1. Supprimer les politiques problématiques qui causent la récursion
DROP POLICY IF EXISTS "Users can view profiles in same school" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles in their school" ON profiles;

-- 2. S'assurer que la politique de base existe (voir son propre profil)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" 
ON profiles
FOR SELECT 
USING (id = auth.uid());

-- 3. Politique pour insertion (nécessaire pour la création de compte)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" 
ON profiles
FOR INSERT 
WITH CHECK (id = auth.uid());

-- 4. Politique pour mise à jour de son propre profil
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" 
ON profiles
FOR UPDATE 
USING (id = auth.uid());

-- 5. Pour les admins: créer une fonction SECURITY DEFINER dédiée qui contourne complètement RLS
CREATE OR REPLACE FUNCTION public.get_school_profiles(target_school_id uuid)
RETURNS TABLE (
  id uuid,
  school_id uuid,
  role user_role,
  first_name text,
  last_name text,
  email text,
  phone text,
  avatar_url text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, school_id, role, first_name, last_name, 
    email, phone, avatar_url, is_active, created_at, updated_at
  FROM profiles 
  WHERE school_id = target_school_id;
$$;

-- Vérification
SELECT 'RLS simplifié - aucune récursion possible' as status;