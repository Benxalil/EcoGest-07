-- Réinitialiser le compte en mode essai avec 7 jours restants
-- 1. Supprimer d'abord les transactions de paiement liées
DELETE FROM payment_transactions 
WHERE school_id = '0adfd464-9161-4552-92ba-419cf8bb3199';

-- 2. Supprimer l'abonnement actif existant
DELETE FROM subscriptions 
WHERE school_id = '0adfd464-9161-4552-92ba-419cf8bb3199';

-- 3. Mettre à jour l'école en mode trial avec 7 jours restants
UPDATE schools
SET 
  subscription_status = 'trial',
  subscription_plan = 'free',
  trial_end_date = NOW() + INTERVAL '7 days',
  updated_at = NOW()
WHERE id = '0adfd464-9161-4552-92ba-419cf8bb3199';