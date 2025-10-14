-- Corriger la fonction de création de notifications pour les annonces
-- Le problème est dans la comparaison de types entre user_role (enum) et text

DROP TRIGGER IF EXISTS on_announcement_created ON announcements;
DROP FUNCTION IF EXISTS create_announcement_notifications();

CREATE OR REPLACE FUNCTION public.create_announcement_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      -- Ou si le rôle de l'utilisateur est dans target_role (avec cast explicite)
      (NEW.target_role IS NOT NULL AND p.role::text = ANY(NEW.target_role::text[]))
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
$function$;

-- Recréer le trigger
CREATE TRIGGER on_announcement_created
  AFTER INSERT ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION create_announcement_notifications();