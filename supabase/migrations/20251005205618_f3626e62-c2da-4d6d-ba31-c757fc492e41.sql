-- Ajouter le champ semester à la table exams
ALTER TABLE exams 
ADD COLUMN semester VARCHAR(20);

-- Ajouter un commentaire pour expliquer le champ
COMMENT ON COLUMN exams.semester IS 'Semestre ou trimestre de l''examen (ex: 1er semestre, 2e semestre, 1er trimestre, etc.)';

-- Créer un index pour améliorer les performances des requêtes par semestre
CREATE INDEX idx_exams_semester ON exams(semester) WHERE semester IS NOT NULL;