
-- Renouveler la période d'essai pour 7 jours supplémentaires
UPDATE public.schools
SET 
  trial_end_date = NOW() + INTERVAL '7 days',
  subscription_status = 'trial',
  updated_at = NOW()
WHERE trial_end_date < NOW();
