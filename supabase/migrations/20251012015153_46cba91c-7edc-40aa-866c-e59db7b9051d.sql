-- Corriger les politiques RLS de la table announcements pour éviter l'erreur de type
-- Le problème est que profiles.role est de type user_role (enum) mais on le compare avec text

-- Supprimer les anciennes politiques qui causent l'erreur
DROP POLICY IF EXISTS "School admins can insert announcements" ON announcements;
DROP POLICY IF EXISTS "School admins can update announcements" ON announcements;
DROP POLICY IF EXISTS "School admins can delete announcements" ON announcements;
DROP POLICY IF EXISTS "Users can view announcements from their school" ON announcements;

-- Recréer les politiques avec cast explicite pour éviter l'erreur de type
CREATE POLICY "School admins can insert announcements" 
ON announcements 
FOR INSERT 
WITH CHECK (
  school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role::text = 'school_admin'
  )
);

CREATE POLICY "School admins can update announcements" 
ON announcements 
FOR UPDATE 
USING (
  school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role::text = 'school_admin'
  )
);

CREATE POLICY "School admins can delete announcements" 
ON announcements 
FOR DELETE 
USING (
  school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role::text = 'school_admin'
  )
);

CREATE POLICY "Users can view announcements from their school" 
ON announcements 
FOR SELECT 
USING (
  school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);