-- Insert a test school to allow announcement creation
INSERT INTO public.schools (
  id,
  name,
  address,
  phone,
  email,
  academic_year,
  subscription_status,
  trial_end_date
) VALUES (
  gen_random_uuid(),
  'École de Test',
  '123 Rue de Test, Test City',
  '+1234567890',
  'test@ecole.com',
  '2024/2025',
  'trial',
  now() + interval '30 days'
);