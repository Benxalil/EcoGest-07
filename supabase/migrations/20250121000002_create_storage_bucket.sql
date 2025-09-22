-- Créer le bucket de stockage pour les fichiers des élèves
-- Cette migration assure que le bucket existe avant d'essayer d'y uploader des fichiers

-- Supprimer le bucket s'il existe déjà (pour éviter les conflits)
DELETE FROM storage.buckets WHERE id = 'student-files';

-- Créer le bucket avec les bonnes configurations
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'student-files', 
  'student-files', 
  false, 
  10485760, -- 10MB en bytes
  ARRAY[
    'image/jpeg', 
    'image/png', 
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'text/plain'
  ]
);

-- Vérifier que le bucket a été créé
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'student-files') THEN
    RAISE EXCEPTION 'Le bucket student-files n''a pas pu être créé';
  END IF;
END $$;
