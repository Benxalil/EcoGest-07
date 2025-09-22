-- Vérifier que les colonnes ont été ajoutées correctement
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'announcements'
ORDER BY ordinal_position;

-- Tester l'insertion d'une annonce avec priorité
INSERT INTO announcements (title, content, priority, target_audience, school_id, author_id, is_published)
VALUES (
    'Test Annonce Urgente',
    'Ceci est un test pour vérifier la priorité urgente',
    'urgent',
    ARRAY['tous'],
    (SELECT id FROM schools LIMIT 1),
    (SELECT id FROM profiles LIMIT 1),
    true
);

-- Vérifier que l'annonce a été créée avec la bonne priorité
SELECT id, title, priority, target_audience, created_at
FROM announcements 
WHERE title = 'Test Annonce Urgente'
ORDER BY created_at DESC
LIMIT 1;

-- Nettoyer le test
DELETE FROM announcements WHERE title = 'Test Annonce Urgente';
