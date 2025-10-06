-- Mettre à jour le compte benxalilcrypto@gmail.com en super_admin

UPDATE public.profiles 
SET role = 'super_admin'
WHERE email = 'benxalilcrypto@gmail.com';

-- Vérifier que la mise à jour a bien été effectuée
SELECT id, email, role, first_name, last_name
FROM public.profiles
WHERE email = 'benxalilcrypto@gmail.com';