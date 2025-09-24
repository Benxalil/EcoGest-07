-- Diagnostic complet du problème grades
-- 1. Vérifier si la table existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades' AND table_schema = 'public') 
    THEN 'Table grades EXISTE'
    ELSE 'Table grades N''EXISTE PAS'
  END as table_status;

-- 2. Si elle existe, vérifier sa structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Vérifier les tables liées
SELECT 'students' as table_name, COUNT(*) as count FROM students
UNION ALL
SELECT 'subjects' as table_name, COUNT(*) as count FROM subjects
UNION ALL
SELECT 'schools' as table_name, COUNT(*) as count FROM schools;
