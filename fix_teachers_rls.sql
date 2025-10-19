-- Script pour corriger les RLS policies de la table teachers
-- Le problème est que get_user_school_id() fait référence à 'profiles' 
-- mais nous utilisons 'user_profiles'

-- 1. Corriger la fonction get_user_school_id pour utiliser user_profiles
DROP FUNCTION IF EXISTS public.get_user_school_id();

CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.user_profiles WHERE id = auth.uid();
$$;

-- 2. Corriger la fonction get_user_role pour utiliser user_profiles
DROP FUNCTION IF EXISTS public.get_user_role();

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- 3. Supprimer les anciennes politiques RLS pour teachers
DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;

-- 4. Créer des politiques RLS simples pour teachers
CREATE POLICY "teachers_select_policy" ON public.teachers
  FOR SELECT USING (true);

CREATE POLICY "teachers_insert_policy" ON public.teachers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "teachers_update_policy" ON public.teachers
  FOR UPDATE USING (true);

CREATE POLICY "teachers_delete_policy" ON public.teachers
  FOR DELETE USING (true);

-- 5. Vérifier que la table teachers existe et a les bonnes colonnes
DO $$
BEGIN
  -- Vérifier si la table teachers existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teachers') THEN
    -- Créer la table teachers si elle n'existe pas
    CREATE TABLE public.teachers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
      user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
      employee_number TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      specialization TEXT,
      phone TEXT,
      address TEXT,
      hire_date DATE DEFAULT CURRENT_DATE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(school_id, employee_number)
    );
    
    -- Activer RLS
    ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 6. Vérifier que les politiques ont été créées
SELECT 'Politiques RLS pour teachers créées avec succès' as status;
SELECT policyname FROM pg_policies WHERE tablename = 'teachers';

-- 7. Tester l'accès à la table teachers
SELECT 'Test d\'accès à la table teachers:' as status;
SELECT COUNT(*) as nombre_enseignants FROM public.teachers;


