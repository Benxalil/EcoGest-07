-- Script pour rendre teacher_id nullable dans la table exams
-- Ceci évite l'erreur de contrainte de clé étrangère

-- Supprimer la contrainte NOT NULL sur teacher_id
ALTER TABLE exams ALTER COLUMN teacher_id DROP NOT NULL;

-- Optionnel : Ajouter un commentaire pour expliquer pourquoi teacher_id peut être null
COMMENT ON COLUMN exams.teacher_id IS 'ID de l''enseignant responsable (peut être null si non assigné)';
