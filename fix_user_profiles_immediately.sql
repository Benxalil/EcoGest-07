-- Script pour corriger immédiatement l'erreur "relation user_profiles does not exist"
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

-- 5. Insérer un profil par défaut pour l'admin
INSERT INTO user_profiles (id, school_id, role, first_name, last_name, email)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'admin',
  'Admin',
  'System',
  'admin@ecogest.com'
)
ON CONFLICT (id) DO NOTHING;

-- 6. Vérifier que la table a été créée
SELECT 'Table user_profiles créée avec succès' as status;
SELECT COUNT(*) as nombre_profils FROM user_profiles;
