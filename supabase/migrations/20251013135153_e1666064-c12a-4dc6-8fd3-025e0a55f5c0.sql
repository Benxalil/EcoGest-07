-- Corriger définitivement le problème des RLS policies sur announcements
-- L'erreur "operator does not exist: text = user_role" vient du fait que les politiques
-- comparent directement role (qui est un enum user_role) avec 'school_admin' (text)

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "School admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "School admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "School admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can view announcements from their school" ON public.announcements;

-- Recréer les politiques avec le bon casting explicite
CREATE POLICY "School admins can insert announcements" 
ON public.announcements
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.school_id = announcements.school_id
    AND profiles.role::text = 'school_admin'
  )
);

CREATE POLICY "School admins can update announcements" 
ON public.announcements
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.school_id = announcements.school_id
    AND profiles.role::text = 'school_admin'
  )
);

CREATE POLICY "School admins can delete announcements" 
ON public.announcements
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.school_id = announcements.school_id
    AND profiles.role::text = 'school_admin'
  )
);

CREATE POLICY "Users can view announcements from their school" 
ON public.announcements
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = announcements.school_id
  )
);