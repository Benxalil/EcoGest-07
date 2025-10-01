-- Migration pour le système hybride d'authentification
-- Administrateurs: email classique
-- Enseignants/Élèves/Parents: matricule simple

-- 1. Supprimer le trigger problématique qui cause les erreurs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. S'assurer que la table profiles a la bonne structure
-- (pas de modifications nécessaires, elle existe déjà)

-- 3. Créer un index sur email pour la recherche rapide
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. Commentaire explicatif du nouveau système
COMMENT ON TABLE public.profiles IS 'Table des profils utilisateurs. Les admins utilisent des emails classiques, les autres utilisent des matricules (Prof03, Eleve001, etc.)';
