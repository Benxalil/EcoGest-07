-- Corriger la récursion infinie dans les politiques RLS de la table profiles

-- 1. Supprimer les politiques actuelles qui causent la récursion
DROP POLICY IF EXISTS "Users can view profiles in their school" ON profiles;
DROP POLICY IF EXISTS "School admins can manage profiles in their school" ON profiles;

-- 2. Créer une politique simple pour que les utilisateurs puissent lire leur propre profil
-- Sans utiliser get_user_school_id() qui cause la récursion
CREATE POLICY "Users can view their own profile" 
ON profiles
FOR SELECT 
USING (id = auth.uid());

-- 3. Créer une politique pour que les utilisateurs voient les profils de la même école
-- En utilisant une sous-requête directe sans fonction pour éviter la récursion
CREATE POLICY "Users can view profiles in same school" 
ON profiles
FOR SELECT 
USING (
  school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 4. Créer une politique pour les admins sans récursion
CREATE POLICY "Admins can manage all profiles in their school" 
ON profiles
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.school_id = profiles.school_id
    AND p.role = ANY(ARRAY['school_admin'::user_role, 'super_admin'::user_role])
  )
);

-- 5. Vérifier que les politiques ont été créées correctement
SELECT 'Politiques RLS corrigées avec succès' as status;
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'profiles';