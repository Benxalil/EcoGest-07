-- Supprimer la configuration PayTech du système

-- Supprimer les tables liées à PayTech
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS payment_config CASCADE;

-- Nettoyer les références PayTech dans les subscriptions
ALTER TABLE subscriptions 
DROP COLUMN IF EXISTS paytech_transaction_id;