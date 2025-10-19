-- Script final pour configurer correctement la table subjects
-- et s'assurer que la section Notes est liée à la section Matières

-- 1. S'assurer que les colonnes existent
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 20;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS coefficient DECIMAL(3,2) DEFAULT 1.0;

-- 2. Mettre à jour les valeurs par défaut
UPDATE subjects SET max_score = 20 WHERE max_score IS NULL;
UPDATE subjects SET coefficient = 1.0 WHERE coefficient IS NULL;

-- 3. Ajouter des contraintes pour s'assurer de la validité des données
ALTER TABLE subjects ADD CONSTRAINT IF NOT EXISTS check_max_score_positive CHECK (max_score > 0);
ALTER TABLE subjects ADD CONSTRAINT IF NOT EXISTS check_coefficient_positive CHECK (coefficient > 0);

-- 4. Mettre à jour les matières existantes avec des exemples réalistes
-- Mathématiques : coefficient 3, barème /20
UPDATE subjects SET 
  coefficient = 3.0, 
  max_score = 20 
WHERE name ILIKE '%math%' OR name ILIKE '%mathématiques%';

-- Français : coefficient 3, barème /20  
UPDATE subjects SET 
  coefficient = 3.0, 
  max_score = 20 
WHERE name ILIKE '%français%' OR name ILIKE '%francais%' OR name ILIKE '%franc%';

-- Sciences : coefficient 2, barème /20
UPDATE subjects SET 
  coefficient = 2.0, 
  max_score = 20 
WHERE name ILIKE '%sciences%' OR name ILIKE '%physique%' OR name ILIKE '%chimie%' OR name ILIKE '%svt%';

-- Histoire-Géographie : coefficient 2, barème /20
UPDATE subjects SET 
  coefficient = 2.0, 
  max_score = 20 
WHERE name ILIKE '%histoire%' OR name ILIKE '%géographie%' OR name ILIKE '%geographie%' OR name ILIKE '%hist%';

-- Éducation Physique : coefficient 1, barème /10
UPDATE subjects SET 
  coefficient = 1.0, 
  max_score = 10 
WHERE name ILIKE '%éducation physique%' OR name ILIKE '%education physique%' OR name ILIKE '%sport%' OR name ILIKE '%eps%';

-- Arts : coefficient 1, barème /10
UPDATE subjects SET 
  coefficient = 1.0, 
  max_score = 10 
WHERE name ILIKE '%art%' OR name ILIKE '%dessin%' OR name ILIKE '%musique%' OR name ILIKE '%plastique%';

-- Langues : coefficient 2, barème /20
UPDATE subjects SET 
  coefficient = 2.0, 
  max_score = 20 
WHERE name ILIKE '%anglais%' OR name ILIKE '%espagnol%' OR name ILIKE '%allemand%' OR name ILIKE '%langue%';

-- 5. Vérifier les résultats
SELECT 
  name, 
  coefficient, 
  max_score,
  CASE 
    WHEN max_score = 20 THEN 'Barème /20'
    WHEN max_score = 10 THEN 'Barème /10'
    ELSE 'Barème /' || max_score
  END as barème_display
FROM subjects 
ORDER BY name;

-- 6. Compter les matières par configuration
SELECT 
  CONCAT('Coefficient ', coefficient) as coefficient,
  CONCAT('Barème /', max_score) as barème,
  COUNT(*) as nombre_matières
FROM subjects 
GROUP BY coefficient, max_score 
ORDER BY coefficient DESC, max_score DESC;
