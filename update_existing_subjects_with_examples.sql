-- Mettre à jour les matières existantes avec des exemples de coefficients et barèmes
-- D'abord, s'assurer que les colonnes existent
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 20;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS coefficient DECIMAL(3,2) DEFAULT 1.0;

-- Mettre à jour les matières existantes avec des valeurs par défaut
UPDATE subjects SET max_score = 20 WHERE max_score IS NULL;
UPDATE subjects SET coefficient = 1.0 WHERE coefficient IS NULL;

-- Exemples de matières avec différents coefficients et barèmes
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

-- Vérifier les résultats
SELECT name, coefficient, max_score FROM subjects ORDER BY name;
