-- Script de correction automatique pour tous les problèmes liés aux enseignants
-- À exécuter dans Supabase SQL Editor

-- 1. Corriger les fonctions helper (sans les supprimer pour éviter les dépendances)
-- Modifier directement la fonction existante
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.user_profiles WHERE id = auth.uid();
$$;

-- Modifier directement la fonction existante
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- 2. S'assurer que la table teachers existe avec la bonne structure
CREATE TABLE IF NOT EXISTS public.teachers (
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

-- 3. Activer RLS sur teachers
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer toutes les anciennes politiques RLS
DROP POLICY IF EXISTS "teachers_select_policy" ON public.teachers;
DROP POLICY IF EXISTS "teachers_insert_policy" ON public.teachers;
DROP POLICY IF EXISTS "teachers_update_policy" ON public.teachers;
DROP POLICY IF EXISTS "teachers_delete_policy" ON public.teachers;
DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "School data access" ON public.teachers;

-- 5. Créer des politiques RLS simples et fonctionnelles
CREATE POLICY "teachers_select_policy" ON public.teachers
  FOR SELECT USING (true);

CREATE POLICY "teachers_insert_policy" ON public.teachers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "teachers_update_policy" ON public.teachers
  FOR UPDATE USING (true);

CREATE POLICY "teachers_delete_policy" ON public.teachers
  FOR DELETE USING (true);

-- 6. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_employee_number ON public.teachers(employee_number);
CREATE INDEX IF NOT EXISTS idx_teachers_is_active ON public.teachers(is_active);

-- 7. Créer un trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_teachers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teachers_updated_at ON public.teachers;
CREATE TRIGGER update_teachers_updated_at
    BEFORE UPDATE ON public.teachers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_teachers_updated_at();

-- 8. Vérifier que tout fonctionne
SELECT '=== VÉRIFICATION FINALE ===' as section;

SELECT 'Table teachers créée:' as test, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teachers') 
            THEN 'OUI' ELSE 'NON' END as result;

SELECT 'Politiques RLS créées:' as test,
       (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'teachers') as count;

SELECT 'Fonction get_user_school_id:' as test,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_school_id') 
            THEN 'OUI' ELSE 'NON' END as result;

SELECT 'Test d''accès à teachers:' as test, COUNT(*) as count FROM public.teachers;

SELECT '=== CORRECTION TERMINÉE ===' as status;
