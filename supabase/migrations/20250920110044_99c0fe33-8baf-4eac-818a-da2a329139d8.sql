-- Créer les tables pour l'intégration PayTech centralisée

-- Configuration PayTech globale (une seule ligne, gérée par le super admin)
CREATE TABLE public.payment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encrypted_api_key text NOT NULL,
  encrypted_secret_key text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox', -- 'sandbox' ou 'production'
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Plans d'abonnement disponibles
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, -- 'starter_monthly', 'pro_annual', etc.
  name text NOT NULL,
  price integer NOT NULL, -- en centimes XOF
  currency text DEFAULT 'XOF',
  period text NOT NULL, -- 'monthly' ou 'annual'
  max_students integer,
  max_classes integer,
  features jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Abonnements actifs par école
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'expired', 'canceled'
  start_date timestamptz,
  end_date timestamptz,
  paytech_transaction_id text,
  amount integer,
  currency text DEFAULT 'XOF',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Historique des transactions PayTech
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.subscriptions(id),
  school_id uuid NOT NULL REFERENCES public.schools(id),
  paytech_transaction_id text,
  amount integer NOT NULL,
  currency text DEFAULT 'XOF',
  status text NOT NULL, -- 'pending', 'success', 'failed'
  gateway_response jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS sur toutes les tables
ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
-- Payment config: uniquement super_admin
CREATE POLICY "Super admins can manage payment config" 
ON public.payment_config 
FOR ALL 
USING (get_user_role() = 'super_admin'::user_role);

-- Plans: lecture pour tous, modification super_admin
CREATE POLICY "Everyone can view subscription plans" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Super admins can manage subscription plans" 
ON public.subscription_plans 
FOR ALL 
USING (get_user_role() = 'super_admin'::user_role);

-- Subscriptions: école uniquement
CREATE POLICY "School data access for subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (school_id = get_user_school_id());

-- Payment transactions: école uniquement
CREATE POLICY "School data access for payment transactions" 
ON public.payment_transactions 
FOR ALL 
USING (school_id = get_user_school_id());

-- Insérer les plans d'abonnement par défaut
INSERT INTO public.subscription_plans (code, name, price, period, max_students, max_classes, features) VALUES
('starter_monthly', 'Starter', 5000000, 'monthly', 200, 6, '{"announcements": true, "basic_reports": true}'),
('starter_annual', 'Starter', 50000000, 'annual', 200, 6, '{"announcements": true, "basic_reports": true}'),
('pro_monthly', 'Pro', 15000000, 'monthly', 500, 15, '{"announcements": true, "basic_reports": true, "advanced_reports": true, "payment_management": true}'),
('pro_annual', 'Pro', 150000000, 'annual', 500, 15, '{"announcements": true, "basic_reports": true, "advanced_reports": true, "payment_management": true}'),
('premium_monthly', 'Premium', 25000000, 'monthly', null, null, '{"announcements": true, "basic_reports": true, "advanced_reports": true, "payment_management": true, "api_access": true, "priority_support": true}'),
('premium_annual', 'Premium', 250000000, 'annual', null, null, '{"announcements": true, "basic_reports": true, "advanced_reports": true, "payment_management": true, "api_access": true, "priority_support": true}');

-- Trigger pour updated_at
CREATE TRIGGER update_payment_config_updated_at
  BEFORE UPDATE ON public.payment_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();