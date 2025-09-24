-- Mettre à jour les matières existantes avec des coefficients et barèmes variés
-- D'abord, ajouter la colonne max_score si elle n'existe pas
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 20;

-- Mettre à jour les matières existantes avec des valeurs par défaut
UPDATE subjects SET max_score = 20 WHERE max_score IS NULL;
UPDATE subjects SET coefficient = 1 WHERE coefficient IS NULL;

-- Exemples de matières avec différents coefficients et barèmes
-- Mathématiques : coefficient 3, barème /20
UPDATE subjects SET coefficient = 3, max_score = 20 WHERE name ILIKE '%math%';

-- Français : coefficient 3, barème /20  
UPDATE subjects SET coefficient = 3, max_score = 20 WHERE name ILIKE '%français%' OR name ILIKE '%francais%';

-- Sciences : coefficient 2, barème /20
UPDATE subjects SET coefficient = 2, max_score = 20 WHERE name ILIKE '%sciences%' OR name ILIKE '%physique%' OR name ILIKE '%chimie%';

-- Histoire-Géographie : coefficient 2, barème /20
UPDATE subjects SET coefficient = 2, max_score = 20 WHERE name ILIKE '%histoire%' OR name ILIKE '%géographie%' OR name ILIKE '%geographie%';

-- Éducation Physique : coefficient 1, barème /10
UPDATE subjects SET coefficient = 1, max_score = 10 WHERE name ILIKE '%éducation physique%' OR name ILIKE '%education physique%' OR name ILIKE '%sport%';

-- Arts : coefficient 1, barème /10
UPDATE subjects SET coefficient = 1, max_score = 10 WHERE name ILIKE '%art%' OR name ILIKE '%dessin%' OR name ILIKE '%musique%';

-- Langues : coefficient 2, barème /20
UPDATE subjects SET coefficient = 2, max_score = 20 WHERE name ILIKE '%anglais%' OR name ILIKE '%espagnol%' OR name ILIKE '%allemand%';

-- Ajouter une contrainte pour s'assurer que max_score est positif
ALTER TABLE subjects ADD CONSTRAINT IF NOT EXISTS check_max_score_positive CHECK (max_score > 0);

-- Ajouter une contrainte pour s'assurer que coefficient est positif
ALTER TABLE subjects ADD CONSTRAINT IF NOT EXISTS check_coefficient_positive CHECK (coefficient > 0);
