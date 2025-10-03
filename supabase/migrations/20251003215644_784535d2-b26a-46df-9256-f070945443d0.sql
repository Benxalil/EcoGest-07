-- Insérer les clés PayTech dans payment_config
INSERT INTO payment_config (encrypted_api_key, encrypted_secret_key, environment, is_active)
VALUES (
  '587185ef82382615d493f20118c54c2f683ee8c49d8fdf1c4d73f74f9b02a9c1',
  'de95e17307d3d114ccbbc4bcb8e9101ea4b37101ff692723c1e334a441608244',
  'sandbox',
  true
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_api_key = EXCLUDED.encrypted_api_key,
  encrypted_secret_key = EXCLUDED.encrypted_secret_key,
  environment = EXCLUDED.environment,
  is_active = EXCLUDED.is_active,
  updated_at = now();