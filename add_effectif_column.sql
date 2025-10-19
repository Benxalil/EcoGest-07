-- Script pour ajouter la colonne effectif à la table classes
-- Ce script vérifie d'abord si la colonne existe, puis l'ajoute si nécessaire

-- 1. Vérifier si la colonne effectif existe déjà
DO $$
BEGIN
    -- Vérifier si la colonne effectif existe dans la table classes
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'classes' 
        AND column_name = 'effectif'
    ) THEN
        -- Ajouter la colonne effectif si elle n'existe pas
        ALTER TABLE classes 
        ADD COLUMN effectif INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Colonne effectif ajoutée à la table classes';
    ELSE
        RAISE NOTICE 'Colonne effectif existe déjà dans la table classes';
    END IF;
END $$;

-- 2. Vérifier la structure de la table classes après modification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'classes' 
ORDER BY ordinal_position;

-- 3. Mettre à jour les effectifs existants avec des valeurs par défaut
-- (optionnel - vous pouvez ajuster ces valeurs selon vos besoins)
UPDATE classes 
SET effectif = 25 
WHERE effectif IS NULL OR effectif = 0;

-- 4. Vérifier les données mises à jour
SELECT 
    id,
    name,
    level,
    section,
    effectif
FROM classes 
LIMIT 5;
