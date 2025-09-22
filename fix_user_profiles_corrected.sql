-- Script corrigé pour créer la table user_profiles
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- 1. Créer la table user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'teacher', 'parent')),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Créer les index
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_id ON user_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- 3. Activer RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Créer les politiques RLS
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Les utilisateurs peuvent voir les profils de leur école" ON user_profiles
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent créer leur propre profil" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5. Vérifier s'il y a des utilisateurs existants
SELECT 'Utilisateurs existants:' as info;
SELECT id, email FROM auth.users LIMIT 5;

-- 6. Créer un profil pour le premier utilisateur existant (s'il y en a un)
INSERT INTO user_profiles (id, school_id, role, first_name, last_name, email)
SELECT 
  u.id,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'admin',
  COALESCE(u.raw_user_meta_data->>'first_name', 'Admin'),
  COALESCE(u.raw_user_meta_data->>'last_name', 'User'),
  u.email
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM user_profiles)
LIMIT 1;

-- 7. Si aucun utilisateur n'existe, créer un utilisateur de test
-- (Décommentez cette section si vous n'avez pas d'utilisateurs)
/*
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@ecogest.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"first_name": "Admin", "last_name": "System"}'::jsonb
);

INSERT INTO user_profiles (id, school_id, role, first_name, last_name, email)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'admin',
  'Admin',
  'System',
  'admin@ecogest.com'
);
*/

-- 8. Vérifier que la table a été créée
SELECT 'Table user_profiles créée avec succès' as status;
SELECT COUNT(*) as nombre_profils FROM user_profiles;
SELECT id, email, role FROM user_profiles;
