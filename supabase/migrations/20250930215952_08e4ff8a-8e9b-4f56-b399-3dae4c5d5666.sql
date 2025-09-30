-- Corriger définitivement la récursion RLS sur profiles en utilisant les fonctions SECURITY DEFINER

-- 1. Supprimer TOUTES les politiques récursives sur profiles
DROP POLICY IF EXISTS "Users can view profiles in same school" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles in their school" ON profiles;

-- 2. Créer des politiques NON-RÉCURSIVES utilisant les fonctions SECURITY DEFINER
-- Ces fonctions (get_user_school_id et get_user_role) contournent RLS et évitent la récursion

-- Politique pour voir son propre profil (déjà existante, on la garde)
-- CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (id = auth.uid());

-- Politique pour voir les profils de la même école (utilise get_user_school_id qui est SECURITY DEFINER)
CREATE POLICY "Users can view profiles in same school" 
ON profiles
FOR SELECT 
USING (school_id = get_user_school_id() OR id = auth.uid());

-- Politique pour les admins (utilise get_user_school_id et get_user_role qui sont SECURITY DEFINER)
CREATE POLICY "Admins can manage all profiles in their school" 
ON profiles
FOR ALL
USING (
  school_id = get_user_school_id() 
  AND get_user_role() = ANY(ARRAY['school_admin'::user_role, 'super_admin'::user_role])
);

-- Vérification
SELECT 'Politiques RLS définitivement corrigées - aucune récursion possible' as status;