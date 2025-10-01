-- Ajouter la colonne parent_matricule à la table students
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS parent_matricule TEXT;

COMMENT ON COLUMN students.parent_matricule IS 'Matricule du parent pour la connexion (ex: PARENT001)';