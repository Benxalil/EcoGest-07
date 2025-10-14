-- Activer la réplication complète pour capturer toutes les données lors des UPDATE
ALTER TABLE public.schools REPLICA IDENTITY FULL;

-- Ajouter la table schools à la publication realtime pour la synchronisation temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE public.schools;