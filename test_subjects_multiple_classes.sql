-- Script de test pour vérifier que la même matière peut être ajoutée dans différentes classes

-- 1. Vérifier les classes existantes
SELECT 
    id,
    name,
    level,
    section,
    school_id
FROM classes
ORDER BY name;

-- 2. Nettoyer les données de test existantes
DELETE FROM subjects WHERE name IN ('Test Mathématiques', 'Test Français');

-- 3. Insérer la même matière "Test Mathématiques" dans toutes les classes
INSERT INTO subjects (id, name, abbreviation, code, class_id, school_id, hours_per_week, color)
SELECT 
    gen_random_uuid(),
    'Test Mathématiques',
    'TEST_MATH',
    'TEST_MATH',
    c.id,
    c.school_id,
    5,
    '#3B82F6'
FROM classes c;

-- 4. Insérer la même matière "Test Français" dans toutes les classes
INSERT INTO subjects (id, name, abbreviation, code, class_id, school_id, hours_per_week, color)
SELECT 
    gen_random_uuid(),
    'Test Français',
    'TEST_FR',
    'TEST_FR',
    c.id,
    c.school_id,
    4,
    '#EF4444'
FROM classes c;

-- 5. Vérifier que les matières ont été créées pour toutes les classes
SELECT 
    s.name,
    s.abbreviation,
    c.name as class_name,
    c.level,
    c.section,
    s.created_at
FROM subjects s
JOIN classes c ON s.class_id = c.id
WHERE s.name IN ('Test Mathématiques', 'Test Français')
ORDER BY s.name, c.name;

-- 6. Tenter d'insérer un doublon dans la même classe (doit échouer)
-- Cette requête doit générer une erreur de contrainte unique
INSERT INTO subjects (id, name, abbreviation, code, class_id, school_id, hours_per_week, color)
SELECT 
    gen_random_uuid(),
    'Test Mathématiques',
    'TEST_MATH_DUPLICATE',
    'TEST_MATH_DUPLICATE',
    c.id,
    c.school_id,
    5,
    '#3B82F6'
FROM classes c
LIMIT 1;
