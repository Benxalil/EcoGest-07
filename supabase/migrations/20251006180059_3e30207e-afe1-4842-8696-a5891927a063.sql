
-- Nettoyer les logos invalides stockés dans le bucket privé student-documents
UPDATE schools 
SET logo_url = NULL 
WHERE logo_url LIKE '%student-documents%';
