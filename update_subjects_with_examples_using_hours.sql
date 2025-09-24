-- Mettre à jour les matières existantes en utilisant hours_per_week pour stocker la note maximale
-- et coefficient pour le coefficient de la matière

-- 1. S'assurer que les colonnes existent
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS coefficient DECIMAL(3,2) DEFAULT 1.0;

-- 2. Mettre à jour les valeurs par défaut
UPDATE subjects SET coefficient = 1.0 WHERE coefficient IS NULL;

-- 3. Mettre à jour les matières existantes avec des exemples réalistes
-- Mathématiques : coefficient 3, barème /20 (stocké dans hours_per_week)
UPDATE subjects SET 
  coefficient = 3.0, 
  hours_per_week = 20 
WHERE name ILIKE '%math%' OR name ILIKE '%mathématiques%';

-- Français : coefficient 3, barème /20  
UPDATE subjects SET 
  coefficient = 3.0, 
  hours_per_week = 20 
WHERE name ILIKE '%français%' OR name ILIKE '%francais%' OR name ILIKE '%franc%';

-- Sciences : coefficient 2, barème /20
UPDATE subjects SET 
  coefficient = 2.0, 
  hours_per_week = 20 
WHERE name ILIKE '%sciences%' OR name ILIKE '%physique%' OR name ILIKE '%chimie%' OR name ILIKE '%svt%';

-- Histoire-Géographie : coefficient 2, barème /20
UPDATE subjects SET 
  coefficient = 2.0, 
  hours_per_week = 20 
WHERE name ILIKE '%histoire%' OR name ILIKE '%géographie%' OR name ILIKE '%geographie%' OR name ILIKE '%hist%';

-- Éducation Physique : coefficient 1, barème /10
UPDATE subjects SET 
  coefficient = 1.0, 
  hours_per_week = 10 
WHERE name ILIKE '%éducation physique%' OR name ILIKE '%education physique%' OR name ILIKE '%sport%' OR name ILIKE '%eps%';

-- Arts : coefficient 1, barème /10
UPDATE subjects SET 
  coefficient = 1.0, 
  hours_per_week = 10 
WHERE name ILIKE '%art%' OR name ILIKE '%dessin%' OR name ILIKE '%musique%' OR name ILIKE '%plastique%';

-- Langues : coefficient 2, barème /20
UPDATE subjects SET 
  coefficient = 2.0, 
  hours_per_week = 20 
WHERE name ILIKE '%anglais%' OR name ILIKE '%espagnol%' OR name ILIKE '%allemand%' OR name ILIKE '%langue%';

-- 4. Vérifier les résultats
SELECT 
  name, 
  coefficient, 
  hours_per_week as note_maximale,
  CASE 
    WHEN hours_per_week = 20 THEN 'Barème /20'
    WHEN hours_per_week = 10 THEN 'Barème /10'
    ELSE 'Barème /' || hours_per_week
  END as barème_display
FROM subjects 
ORDER BY name;

-- 5. Compter les matières par configuration
SELECT 
  CONCAT('Coefficient ', coefficient) as coefficient,
  CONCAT('Barème /', hours_per_week) as barème,
  COUNT(*) as nombre_matières
FROM subjects 
GROUP BY coefficient, hours_per_week 
ORDER BY coefficient DESC, hours_per_week DESC;
