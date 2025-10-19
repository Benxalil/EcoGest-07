-- Script très simple pour créer le bucket student-files
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Créer le bucket student-files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('student-files', 'student-files', false)
ON CONFLICT (id) DO NOTHING;

-- Vérifier que le bucket a été créé
SELECT 'Bucket student-files créé' as status;
SELECT id, name, public FROM storage.buckets WHERE id = 'student-files';
