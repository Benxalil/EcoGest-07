-- Ajouter le champ max_score à la table subjects pour définir le barème (/10, /20, etc.)
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 20;

-- Mettre à jour les matières existantes avec des valeurs par défaut
UPDATE subjects SET max_score = 20 WHERE max_score IS NULL;

-- Ajouter une contrainte pour s'assurer que max_score est positif
ALTER TABLE subjects ADD CONSTRAINT check_max_score_positive CHECK (max_score > 0);

-- Ajouter un commentaire pour expliquer le champ
COMMENT ON COLUMN subjects.max_score IS 'Barème maximum pour les notes de cette matière (ex: 10, 20)';
