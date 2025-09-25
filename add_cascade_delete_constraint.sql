-- Script pour ajouter une contrainte de suppression en cascade
-- Ce script modifie la contrainte de clé étrangère pour que la suppression d'un examen
-- supprime automatiquement toutes les notes associées

-- Vérifier d'abord si la contrainte existe
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'grades'
    AND kcu.column_name = 'exam_id';

-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE grades DROP CONSTRAINT IF EXISTS fk_grades_exam_id;

-- Ajouter la nouvelle contrainte avec CASCADE DELETE
ALTER TABLE grades 
ADD CONSTRAINT fk_grades_exam_id 
FOREIGN KEY (exam_id) 
REFERENCES exams(id) 
ON DELETE CASCADE;

-- Vérifier que la contrainte a été ajoutée correctement
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'grades'
    AND kcu.column_name = 'exam_id';

-- Message de confirmation
SELECT 'Contrainte de suppression en cascade ajoutée avec succès !' as message;
