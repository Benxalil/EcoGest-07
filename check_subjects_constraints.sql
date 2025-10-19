-- Script pour vérifier les contraintes de la table subjects

-- 1. Vérifier la structure de la table subjects
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;

-- 2. Vérifier les contraintes de la table subjects
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'subjects'
ORDER BY tc.constraint_name;

-- 3. Vérifier les index de la table subjects
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'subjects';

-- 4. Vérifier les données existantes
SELECT 
    s.id,
    s.name,
    s.abbreviation,
    s.code,
    s.class_id,
    s.school_id,
    c.name as class_name
FROM subjects s
LEFT JOIN classes c ON s.class_id = c.id
ORDER BY s.created_at;

-- 5. Vérifier les classes existantes
SELECT 
    id,
    name,
    level,
    section,
    school_id
FROM classes
ORDER BY name;
