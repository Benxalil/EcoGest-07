-- Script de diagnostic complet pour identifier tous les problèmes potentiels
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier l'état des tables principales
SELECT '=== ÉTAT DES TABLES PRINCIPALES ===' as section;

SELECT 'Table schools:' as table_name, COUNT(*) as count FROM public.schools
UNION ALL
SELECT 'Table user_profiles:' as table_name, COUNT(*) as count FROM public.user_profiles
UNION ALL
SELECT 'Table classes:' as table_name, COUNT(*) as count FROM public.classes
UNION ALL
SELECT 'Table students:' as table_name, COUNT(*) as count FROM public.students
UNION ALL
SELECT 'Table teachers:' as table_name, COUNT(*) as count FROM public.teachers
UNION ALL
SELECT 'Table subjects:' as table_name, COUNT(*) as count FROM public.subjects;

-- 2. Vérifier les fonctions helper
SELECT '=== FONCTIONS HELPER ===' as section;

SELECT 'Fonction get_user_school_id existe:' as test, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_school_id') 
            THEN 'OUI' ELSE 'NON' END as result;

SELECT 'Fonction get_user_role existe:' as test,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_role') 
            THEN 'OUI' ELSE 'NON' END as result;

-- 3. Vérifier les politiques RLS pour teachers
SELECT '=== POLITIQUES RLS POUR TEACHERS ===' as section;

SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'teachers'
ORDER BY policyname;

-- 4. Tester l'accès aux données
SELECT '=== TEST D\'ACCÈS AUX DONNÉES ===' as section;

-- Test d'accès à teachers
SELECT 'Accès à teachers:' as test, COUNT(*) as count FROM public.teachers;

-- Test d'accès à classes
SELECT 'Accès à classes:' as test, COUNT(*) as count FROM public.classes;

-- Test d'accès à students
SELECT 'Accès à students:' as test, COUNT(*) as count FROM public.students;

-- 5. Vérifier les colonnes de la table teachers
SELECT '=== STRUCTURE DE LA TABLE TEACHERS ===' as section;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'teachers' 
ORDER BY ordinal_position;

-- 6. Vérifier les contraintes et index
SELECT '=== CONTRAINTES ET INDEX ===' as section;

SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'teachers';

SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'teachers';
