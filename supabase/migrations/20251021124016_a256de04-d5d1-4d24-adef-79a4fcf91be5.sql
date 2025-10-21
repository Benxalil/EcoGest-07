
-- Prolonger la période d'essai de 7 jours pour l'école Ecole Rose Dieng
UPDATE schools
SET 
  trial_end_date = NOW() + INTERVAL '7 days',
  subscription_status = 'trial'
WHERE id = '0adfd464-9161-4552-92ba-419cf8bb3199';
