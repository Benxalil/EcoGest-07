-- Script pour insérer des données de test si les tables sont vides
-- 1. Vérifier et insérer des données de test pour les écoles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM schools LIMIT 1) THEN
    INSERT INTO schools (id, name, address, phone, email, created_at, updated_at)
    VALUES (
      '0adfd464-9161-4552-92ba-419cf8bb3199'::uuid,
      'École Test',
      '123 Rue de Test',
      '0123456789',
      'test@ecole.com',
      NOW(),
      NOW()
    );
    RAISE NOTICE 'École de test insérée';
  ELSE
    RAISE NOTICE 'École existe déjà';
  END IF;
END $$;

-- 2. Vérifier et insérer des données de test pour les classes
DO $$
DECLARE
  test_school_id UUID;
  test_class_id UUID;
BEGIN
  -- Récupérer l'ID de l'école
  SELECT id INTO test_school_id FROM schools LIMIT 1;
  
  IF test_school_id IS NOT NULL THEN
    -- Vérifier si des classes existent
    IF NOT EXISTS (SELECT 1 FROM classes LIMIT 1) THEN
      -- Insérer une classe de test
      INSERT INTO classes (id, session, libelle, effectif, school_id, created_at, updated_at)
      VALUES (
        'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'::uuid,
        '2024-2025',
        'CE2 Primaire - GB',
        2,
        test_school_id,
        NOW(),
        NOW()
      )
      RETURNING id INTO test_class_id;
      RAISE NOTICE 'Classe de test insérée: %', test_class_id;
    ELSE
      RAISE NOTICE 'Classes existent déjà';
    END IF;
  END IF;
END $$;

-- 3. Vérifier et insérer des données de test pour les étudiants
DO $$
DECLARE
  test_class_id UUID;
  test_student_id UUID;
BEGIN
  -- Récupérer l'ID de la classe
  SELECT id INTO test_class_id FROM classes LIMIT 1;
  
  IF test_class_id IS NOT NULL THEN
    -- Vérifier si des étudiants existent
    IF NOT EXISTS (SELECT 1 FROM students LIMIT 1) THEN
      -- Insérer des étudiants de test
      INSERT INTO students (id, nom, prenom, classe, school_id, created_at, updated_at)
      VALUES 
        ('f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'::uuid, 'Ndao', 'Diao', test_class_id, (SELECT id FROM schools LIMIT 1), NOW(), NOW()),
        ('eb813c65-b378-480a-a4a3-a2a43e5a03c8'::uuid, 'Aw', 'Zeyna', test_class_id, (SELECT id FROM schools LIMIT 1), NOW(), NOW());
      RAISE NOTICE 'Étudiants de test insérés';
    ELSE
      RAISE NOTICE 'Étudiants existent déjà';
    END IF;
  END IF;
END $$;

-- 4. Vérifier et insérer des données de test pour les matières
DO $$
DECLARE
  test_class_id UUID;
  test_subject_id UUID;
BEGIN
  -- Récupérer l'ID de la classe
  SELECT id INTO test_class_id FROM classes LIMIT 1;
  
  IF test_class_id IS NOT NULL THEN
    -- Vérifier si des matières existent
    IF NOT EXISTS (SELECT 1 FROM subjects LIMIT 1) THEN
      -- Insérer des matières de test
      INSERT INTO subjects (id, name, abbreviation, class_id, school_id, coefficient, hours_per_week, color, created_at, updated_at)
      VALUES 
        ('2f64cfa6-cc9d-42da-95c3-68b615ddc2aa'::uuid, 'Education Physique Sportive', 'EPS', test_class_id, (SELECT id FROM schools LIMIT 1), 1.0, 10, '#3B82F6', NOW(), NOW()),
        ('3a75dgb7-dd0e-53eb-96d4-69c726ee3dbb'::uuid, 'Mathématiques', 'MATH', test_class_id, (SELECT id FROM schools LIMIT 1), 2.0, 20, '#EF4444', NOW(), NOW());
      RAISE NOTICE 'Matières de test insérées';
    ELSE
      RAISE NOTICE 'Matières existent déjà';
    END IF;
  END IF;
END $$;

-- 5. Vérifier les données créées
SELECT 'Vérification des données:' as info;
SELECT 'Écoles:' as table_name, COUNT(*) as count FROM schools
UNION ALL
SELECT 'Classes:' as table_name, COUNT(*) as count FROM classes
UNION ALL
SELECT 'Étudiants:' as table_name, COUNT(*) as count FROM students
UNION ALL
SELECT 'Matières:' as table_name, COUNT(*) as count FROM subjects;
