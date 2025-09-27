-- Insérer des données de test pour les absences et retards (correction syntaxe)
INSERT INTO attendances (
  student_id,
  class_id, 
  school_id,
  date,
  type,
  reason,
  period,
  teacher_id
) VALUES 
-- Une absence pour aujourd'hui  
('0ec6633c-e384-4bc9-94d9-646870a15745', 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30', '0adfd464-9161-4552-92ba-419cf8bb3199', CURRENT_DATE, 'absence', 'Maladie', 'Journée', NULL),

-- Un retard pour aujourd'hui
('eb813c65-b378-480a-a4a3-a2a43e5a03c8', 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30', '0adfd464-9161-4552-92ba-419cf8bb3199', CURRENT_DATE, 'retard', 'Transport en retard', 'Matin', NULL),

-- Quelques enregistrements pour hier
('eb813c65-b378-480a-a4a3-a2a43e5a03c8', 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30', '0adfd464-9161-4552-92ba-419cf8bb3199', CURRENT_DATE - INTERVAL '1 day', 'retard', 'Réveil tardif', 'Matin', NULL),
('a32ea9dc-b767-4a82-9fca-4fe5475ead31', 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30', '0adfd464-9161-4552-92ba-419cf8bb3199', CURRENT_DATE - INTERVAL '1 day', 'absence', 'Rendez-vous médical', 'Après-midi', NULL),

-- Quelques enregistrements pour il y a 2 jours
('eb813c65-b378-480a-a4a3-a2a43e5a03c8', 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30', '0adfd464-9161-4552-92ba-419cf8bb3199', CURRENT_DATE - INTERVAL '2 days', 'absence', 'Absence justifiée', 'Matin', NULL),
('0ec6633c-e384-4bc9-94d9-646870a15745', 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30', '0adfd464-9161-4552-92ba-419cf8bb3199', CURRENT_DATE - INTERVAL '2 days', 'retard', 'Transport', 'Matin', NULL),

-- Quelques enregistrements pour il y a 3 jours
('a32ea9dc-b767-4a82-9fca-4fe5475ead31', 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30', '0adfd464-9161-4552-92ba-419cf8bb3199', CURRENT_DATE - INTERVAL '3 days', 'retard', 'Embouteillage', 'Matin', NULL),
('0ec6633c-e384-4bc9-94d9-646870a15745', 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30', '0adfd464-9161-4552-92ba-419cf8bb3199', CURRENT_DATE - INTERVAL '3 days', 'absence', 'Maladie', 'Journée', NULL);