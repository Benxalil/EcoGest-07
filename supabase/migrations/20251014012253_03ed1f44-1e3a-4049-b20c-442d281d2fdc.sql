-- Créer les types ENUM pour les logs d'audit
CREATE TYPE log_level AS ENUM ('debug', 'info', 'warn', 'error', 'critical');
CREATE TYPE log_category AS ENUM ('auth', 'database', 'api', 'ui', 'business', 'security');

-- Créer la table audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  level log_level NOT NULL,
  category log_category NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  context JSONB,
  error_stack TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances de recherche
CREATE INDEX idx_audit_logs_school_created ON public.audit_logs(school_id, created_at DESC);
CREATE INDEX idx_audit_logs_level ON public.audit_logs(level) WHERE level IN ('error', 'critical');
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_category ON public.audit_logs(category, created_at DESC);

-- Activer RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy : Les admins école peuvent voir les logs de leur école
CREATE POLICY "School admins can view their school's logs"
ON public.audit_logs FOR SELECT
USING (
  school_id IN (
    SELECT school_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'school_admin'
  )
);

-- Policy : Permet l'insertion de logs (nécessaire pour les edge functions et le système)
CREATE POLICY "Allow inserting audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- Fonction pour nettoyer automatiquement les vieux logs (garder 90 jours)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND level NOT IN ('error', 'critical');
  
  -- Garder les erreurs critiques pendant 180 jours
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '180 days'
    AND level IN ('error', 'critical');
END;
$$;

-- Commentaires pour la documentation
COMMENT ON TABLE public.audit_logs IS 'Table centralisée pour tous les logs d''audit du système';
COMMENT ON COLUMN public.audit_logs.level IS 'Niveau de sévérité du log';
COMMENT ON COLUMN public.audit_logs.category IS 'Catégorie du log pour filtrage';
COMMENT ON COLUMN public.audit_logs.details IS 'Données supplémentaires au format JSON';
COMMENT ON COLUMN public.audit_logs.context IS 'Contexte d''exécution (userId, schoolId, component, etc.)';
COMMENT ON COLUMN public.audit_logs.error_stack IS 'Stack trace complète pour les erreurs';