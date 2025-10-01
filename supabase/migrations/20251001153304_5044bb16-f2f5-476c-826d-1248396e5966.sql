-- Ajouter une politique RLS pour permettre aux enseignants d'insérer des absences et retards
CREATE POLICY "Teachers can insert attendances"
ON public.attendances
FOR INSERT
TO authenticated
WITH CHECK (
  school_id IN (
    SELECT profiles.school_id
    FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'teacher'::user_role
  )
);

-- Permettre également aux enseignants de mettre à jour les absences/retards qu'ils ont créés
CREATE POLICY "Teachers can update attendances"
ON public.attendances
FOR UPDATE
TO authenticated
USING (
  school_id IN (
    SELECT profiles.school_id
    FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'teacher'::user_role
  )
);