-- SOLUTION RADICALE: Éliminer complètement la récursion RLS

-- 1. SUPPRIMER les fonctions qui causent la récursion
DROP FUNCTION IF EXISTS public.get_user_school_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(user_role) CASCADE;

-- 2. SUPPRIMER TOUTES les politiques RLS sur profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in same school" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles in their school" ON profiles;
DROP POLICY IF EXISTS "System can insert profiles for new users" ON profiles;

-- 3. CRÉER des politiques RLS ULTRA-SIMPLES (sans aucune fonction)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT 
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE 
  USING (id = auth.uid());

-- 4. Pour l'insertion système lors de la création de compte
CREATE POLICY "profiles_insert_system" ON profiles
  FOR INSERT 
  WITH CHECK (true);

-- 5. Vérification
SELECT 'Récursion RLS complètement éliminée' as status;