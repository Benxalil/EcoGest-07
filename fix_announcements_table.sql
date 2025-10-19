-- Ajouter les colonnes manquantes à la table announcements
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
ADD COLUMN IF NOT EXISTS target_audience TEXT[] DEFAULT ARRAY['tous'];

-- Créer un index pour la priorité
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);

-- Créer un index pour l'audience cible
CREATE INDEX IF NOT EXISTS idx_announcements_target_audience ON announcements USING GIN(target_audience);

-- Mettre à jour les annonces existantes avec des valeurs par défaut
UPDATE announcements 
SET 
  priority = 'normal',
  target_audience = ARRAY['tous']
WHERE priority IS NULL OR target_audience IS NULL;
