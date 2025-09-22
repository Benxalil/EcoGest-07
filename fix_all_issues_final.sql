-- Script final pour corriger tous les problèmes
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- 1. Créer la table user_profiles avec des types corrects
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

-- 4. Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur propre profil" ON user_profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir les profils de leur école" ON user_profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leur propre profil" ON user_profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON user_profiles;

-- 5. Créer les politiques RLS avec des types corrects
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" ON user_profiles
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Les utilisateurs peuvent voir les profils de leur école" ON user_profiles
  FOR SELECT USING (
    school_id::text IN (
      SELECT school_id::text FROM user_profiles 
      WHERE id::text = auth.uid()::text
    )
  );

CREATE POLICY "Les utilisateurs peuvent créer leur propre profil" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil" ON user_profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

-- 6. Créer le bucket de stockage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'student-files', 
  'student-files', 
  false, 
  10485760,
  ARRAY[
    'image/jpeg', 
    'image/png', 
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 7. Supprimer les politiques de stockage existantes si elles existent
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir les fichiers de leurs élèves" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent uploader des fichiers pour leurs élèves" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier les fichiers de leurs élèves" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer les fichiers de leurs élèves" ON storage.objects;

-- 8. Créer les politiques RLS pour le bucket avec des types corrects
CREATE POLICY "Les utilisateurs peuvent voir les fichiers de leurs élèves" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'student-files' AND
    (storage.foldername(name))[2]::text IN (
      SELECT school_id::text FROM user_profiles 
      WHERE id::text = auth.uid()::text
    )
  );

CREATE POLICY "Les utilisateurs peuvent uploader des fichiers pour leurs élèves" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'student-files' AND
    (storage.foldername(name))[2]::text IN (
      SELECT school_id::text FROM user_profiles 
      WHERE id::text = auth.uid()::text
    )
  );

CREATE POLICY "Les utilisateurs peuvent modifier les fichiers de leurs élèves" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'student-files' AND
    (storage.foldername(name))[2]::text IN (
      SELECT school_id::text FROM user_profiles 
      WHERE id::text = auth.uid()::text
    )
  );

CREATE POLICY "Les utilisateurs peuvent supprimer les fichiers de leurs élèves" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'student-files' AND
    (storage.foldername(name))[2]::text IN (
      SELECT school_id::text FROM user_profiles 
      WHERE id::text = auth.uid()::text
    )
  );

-- 9. Fonction pour créer automatiquement un profil utilisateur lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name, school_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    '11111111-1111-1111-1111-111111111111'::uuid,
    'admin'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger pour créer automatiquement un profil lors de l'inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Vérifier que tout a été créé
SELECT 'Configuration terminée avec succès' as status;
SELECT 'Table user_profiles:' as info, COUNT(*) as count FROM user_profiles;
SELECT 'Bucket student-files:' as info, COUNT(*) as count FROM storage.buckets WHERE id = 'student-files';
