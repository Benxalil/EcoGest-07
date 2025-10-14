-- Ajouter des index pour optimiser le premier chargement des séries et libellés
CREATE INDEX IF NOT EXISTS idx_default_series_active 
ON default_series(is_active, code) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_default_labels_active 
ON default_labels(is_active, code) 
WHERE is_active = true;

-- Analyser les tables pour mettre à jour les statistiques
ANALYZE default_series;
ANALYZE default_labels;