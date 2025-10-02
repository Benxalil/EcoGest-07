-- Activer Realtime sur la table schedules pour synchronisation temps réel
ALTER TABLE public.schedules REPLICA IDENTITY FULL;

-- Ajouter la table à la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;