-- Test rapide pour vérifier l'état de la table teachers
SELECT 'Test rapide - Table teachers:' as status;
SELECT COUNT(*) as nombre_enseignants FROM public.teachers;

SELECT 'Test rapide - Politiques RLS:' as status;
SELECT policyname FROM pg_policies WHERE tablename = 'teachers';

SELECT 'Test rapide - Fonction get_user_school_id:' as status;
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_user_school_id';


