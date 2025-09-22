-- Vérifier la structure actuelle de la table announcements
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'announcements'
ORDER BY ordinal_position;

-- Vérifier si les colonnes priority et target_audience existent
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'announcements' AND column_name = 'priority'
        ) THEN 'priority column exists'
        ELSE 'priority column MISSING'
    END as priority_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'announcements' AND column_name = 'target_audience'
        ) THEN 'target_audience column exists'
        ELSE 'target_audience column MISSING'
    END as target_audience_status;
