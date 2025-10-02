-- Étape 1 : Normaliser tous les parent_matricule en majuscules
UPDATE students 
SET parent_matricule = UPPER(parent_matricule)
WHERE parent_matricule IS NOT NULL 
  AND parent_matricule != UPPER(parent_matricule);

-- Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_students_parent_matricule ON students(parent_matricule);
CREATE INDEX IF NOT EXISTS idx_students_parent_email ON students(parent_email);