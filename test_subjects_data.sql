-- Script de test pour vérifier les données des matières
-- Vérifier la structure de la table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;

-- Vérifier les données existantes
SELECT id, name, coefficient, max_score, class_id, school_id 
FROM subjects 
ORDER BY name;

-- Compter les matières par barème
SELECT max_score, COUNT(*) as count 
FROM subjects 
GROUP BY max_score 
ORDER BY max_score;

-- Compter les matières par coefficient
SELECT coefficient, COUNT(*) as count 
FROM subjects 
GROUP BY coefficient 
ORDER BY coefficient;
