-- Table des notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('announcement', 'subscription', 'system', 'alert')),
  icon TEXT DEFAULT 'bell',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_school_id ON public.notifications(school_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "School admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'school_admin'
  )
);

CREATE POLICY "School admins can delete notifications"
ON public.notifications
FOR DELETE
USING (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'school_admin'
  )
);

-- Fonction pour créer des notifications d'annonces automatiquement
CREATE OR REPLACE FUNCTION public.create_announcement_notifications()
RETURNS TRIGGER AS $$
DECLARE
  target_user RECORD;
BEGIN
  -- Créer des notifications pour tous les utilisateurs concernés
  FOR target_user IN 
    SELECT DISTINCT p.id, p.school_id
    FROM profiles p
    WHERE p.school_id = NEW.school_id
    AND p.is_active = true
    AND (
      -- Si target_audience contient 'tous'
      'tous' = ANY(NEW.target_audience)
      OR
      -- Ou si le rôle de l'utilisateur est dans target_role
      (NEW.target_role IS NOT NULL AND p.role::text = ANY(NEW.target_role))
    )
  LOOP
    INSERT INTO public.notifications (
      school_id,
      user_id,
      title,
      message,
      type,
      icon,
      link
    ) VALUES (
      target_user.school_id,
      target_user.id,
      NEW.title,
      LEFT(NEW.content, 200),
      'announcement',
      CASE 
        WHEN NEW.priority = 'urgent' THEN 'alert-circle'
        WHEN NEW.priority = 'high' THEN 'alert-triangle'
        ELSE 'megaphone'
      END,
      '/annonces'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour créer des notifications lors de nouvelles annonces
DROP TRIGGER IF EXISTS on_announcement_created ON public.announcements;
CREATE TRIGGER on_announcement_created
  AFTER INSERT ON public.announcements
  FOR EACH ROW
  WHEN (NEW.is_published = true)
  EXECUTE FUNCTION public.create_announcement_notifications();

-- Fonction pour créer des alertes d'abonnement
CREATE OR REPLACE FUNCTION public.check_subscription_expiration()
RETURNS void AS $$
DECLARE
  school_record RECORD;
  days_remaining INTEGER;
  admin_user RECORD;
BEGIN
  FOR school_record IN
    SELECT id, name, trial_end_date, subscription_status
    FROM public.schools
    WHERE subscription_status IN ('trial', 'active')
    AND trial_end_date IS NOT NULL
  LOOP
    days_remaining := EXTRACT(DAY FROM (school_record.trial_end_date - now()));
    
    -- Alerter si moins de 7 jours restants
    IF days_remaining <= 7 AND days_remaining >= 0 THEN
      -- Créer une notification pour tous les admins de l'école
      FOR admin_user IN
        SELECT id FROM profiles
        WHERE school_id = school_record.id
        AND role = 'school_admin'
        AND is_active = true
      LOOP
        -- Vérifier si une notification similaire n'existe pas déjà aujourd'hui
        IF NOT EXISTS (
          SELECT 1 FROM public.notifications
          WHERE user_id = admin_user.id
          AND type = 'subscription'
          AND created_at::date = CURRENT_DATE
        ) THEN
          INSERT INTO public.notifications (
            school_id,
            user_id,
            title,
            message,
            type,
            icon,
            link
          ) VALUES (
            school_record.id,
            admin_user.id,
            '⚠️ Abonnement arrivant à expiration',
            'Votre abonnement arrive à expiration dans ' || days_remaining || ' jour(s). Veuillez renouveler pour continuer à utiliser le système.',
            'subscription',
            'alert-triangle',
            '/abonnement'
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notifications_updated_at();