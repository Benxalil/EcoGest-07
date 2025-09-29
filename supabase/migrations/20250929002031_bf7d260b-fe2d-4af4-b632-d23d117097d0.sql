-- Ajouter le champ starter_compatible à la table schools
ALTER TABLE public.schools 
ADD COLUMN starter_compatible boolean NOT NULL DEFAULT true;

-- Mettre à jour les écoles existantes qui dépassent déjà les limites Starter
-- (écoles avec plus de 6 classes ou plus de 200 élèves)
UPDATE public.schools 
SET starter_compatible = false 
WHERE id IN (
  SELECT DISTINCT s.id 
  FROM schools s
  LEFT JOIN classes c ON s.id = c.school_id
  LEFT JOIN students st ON s.id = st.school_id
  GROUP BY s.id
  HAVING 
    COUNT(DISTINCT c.id) > 6 OR 
    COUNT(DISTINCT st.id) > 200
);