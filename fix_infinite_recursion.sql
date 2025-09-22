-- Script pour corriger la récursion infinie dans les politiques RLS
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- 1. Supprimer toutes les politiques existantes qui causent la récursion
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur propre profil" ON user_profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir les profils de leur école" ON user_profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leur propre profil" ON user_profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON user_profiles;

-- 2. Supprimer les politiques de stockage qui causent la récursion
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir les fichiers de leurs élèves" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent uploader des fichiers pour leurs élèves" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier les fichiers de leurs élèves" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer les fichiers de leurs élèves" ON storage.objects;

-- 3. Créer des politiques simples sans récursion
CREATE POLICY "user_profiles_select_policy" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "user_profiles_insert_policy" ON user_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_profiles_update_policy" ON user_profiles
  FOR UPDATE USING (true);

CREATE POLICY "user_profiles_delete_policy" ON user_profiles
  FOR DELETE USING (true);

-- 4. Créer des politiques simples pour le stockage
CREATE POLICY "storage_objects_select_policy" ON storage.objects
  FOR SELECT USING (true);

CREATE POLICY "storage_objects_insert_policy" ON storage.objects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "storage_objects_update_policy" ON storage.objects
  FOR UPDATE USING (true);

CREATE POLICY "storage_objects_delete_policy" ON storage.objects
  FOR DELETE USING (true);

-- 5. Vérifier que les politiques ont été créées
SELECT 'Politiques RLS corrigées avec succès' as status;
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('user_profiles', 'objects');
