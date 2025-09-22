-- Créer la table user_profiles
-- Cette table stocke les informations de profil des utilisateurs authentifiés

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

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_id ON user_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Activer RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
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

-- Fonction pour créer automatiquement un profil utilisateur lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil lors de l'inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insérer un profil par défaut pour l'utilisateur admin s'il n'existe pas
INSERT INTO user_profiles (id, school_id, role, first_name, last_name, email)
SELECT 
  '00000000-0000-0000-0000-000000000000'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'admin',
  'Admin',
  'System',
  'admin@ecogest.com'
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
);
