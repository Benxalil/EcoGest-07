-- Corriger les prix d'abonnement selon les nouvelles spécifications
UPDATE subscription_plans SET price = 2500000 WHERE code = 'starter_monthly'; -- 25 000 FCFA en centimes
UPDATE subscription_plans SET price = 4000000 WHERE code = 'pro_monthly'; -- 40 000 FCFA en centimes  
UPDATE subscription_plans SET price = 6000000 WHERE code = 'premium_monthly'; -- 60 000 FCFA en centimes

UPDATE subscription_plans SET price = 20200000 WHERE code = 'starter_annual'; -- 202 000 FCFA en centimes
UPDATE subscription_plans SET price = 35900000 WHERE code = 'pro_annual'; -- 359 000 FCFA en centimes
UPDATE subscription_plans SET price = 48600000 WHERE code = 'premium_annual'; -- 486 000 FCFA en centimes

-- Corriger les limites pour le plan Pro (500 élèves, 15 classes selon l'interface)
UPDATE subscription_plans SET max_students = 500, max_classes = 15 WHERE code = 'pro_monthly';
UPDATE subscription_plans SET max_students = 500, max_classes = 15 WHERE code = 'pro_annual';