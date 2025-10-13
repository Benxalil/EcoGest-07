-- Corriger les politiques RLS de la table announcements
-- Le problème vient d'une incompatibilité de types entre text et user_role

-- Supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "School admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "School admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "School admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can view announcements from their school" ON public.announcements;

-- Recréer les politiques avec le bon casting
CREATE POLICY "School admins can insert announcements" 
ON public.announcements
FOR INSERT 
WITH CHECK (
  school_id IN (
    SELECT school_id
    FROM profiles
    WHERE id = auth.uid() 
    AND role = 'school_admin'::user_role
  )
);

CREATE POLICY "School admins can update announcements" 
ON public.announcements
FOR UPDATE 
USING (
  school_id IN (
    SELECT school_id
    FROM profiles
    WHERE id = auth.uid() 
    AND role = 'school_admin'::user_role
  )
);

CREATE POLICY "School admins can delete announcements" 
ON public.announcements
FOR DELETE 
USING (
  school_id IN (
    SELECT school_id
    FROM profiles
    WHERE id = auth.uid() 
    AND role = 'school_admin'::user_role
  )
);

CREATE POLICY "Users can view announcements from their school" 
ON public.announcements
FOR SELECT 
USING (
  school_id IN (
    SELECT school_id
    FROM profiles
    WHERE id = auth.uid()
  )
);