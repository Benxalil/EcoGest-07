
-- Créer un abonnement actif pour l'école (Pro Mensuel)
INSERT INTO subscriptions (
  school_id,
  plan_id,
  status,
  amount,
  currency,
  start_date,
  end_date,
  paytech_transaction_id
) VALUES (
  '0adfd464-9161-4552-92ba-419cf8bb3199',
  'b1a25ca5-4104-4d09-81f0-4e8a774260e2',
  'active',
  4000000,
  'XOF',
  NOW(),
  NOW() + INTERVAL '30 days',
  'TEST_TRANSACTION_' || gen_random_uuid()::text
);

-- Mettre à jour le statut de l'école (utiliser 'premium' qui est accepté par la contrainte)
UPDATE schools
SET 
  subscription_status = 'active',
  subscription_plan = 'premium',
  trial_end_date = NULL,
  updated_at = NOW()
WHERE id = '0adfd464-9161-4552-92ba-419cf8bb3199';
