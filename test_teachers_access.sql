-- Script de test pour vérifier l'accès à la table teachers
-- À exécuter après avoir appliqué fix_teachers_rls.sql

-- 1. Vérifier que la table teachers existe
SELECT 'Vérification de la table teachers:' as test;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teachers' 
ORDER BY ordinal_position;

-- 2. Vérifier les politiques RLS
SELECT 'Politiques RLS pour teachers:' as test;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'teachers';

-- 3. Vérifier la fonction get_user_school_id
SELECT 'Fonction get_user_school_id:' as test;
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'get_user_school_id';

-- 4. Tester l'accès à la table teachers (doit retourner 0 si pas d'enseignants)
SELECT 'Test d\'accès à teachers:' as test;
SELECT COUNT(*) as nombre_enseignants FROM public.teachers;

-- 5. Vérifier que l'utilisateur actuel a un profil
SELECT 'Profil utilisateur actuel:' as test;
SELECT id, school_id, role, first_name, last_name 
FROM public.user_profiles 
WHERE id = auth.uid();

-- 6. Vérifier les écoles disponibles
SELECT 'Écoles disponibles:' as test;
SELECT id, name, created_at 
FROM public.schools 
ORDER BY created_at DESC;


