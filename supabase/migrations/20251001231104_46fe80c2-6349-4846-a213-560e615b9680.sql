-- Ajouter des politiques RLS pour permettre aux enseignants de gérer les notes

-- Permettre aux enseignants d'insérer des notes pour leur école
CREATE POLICY "Teachers can insert grades"
ON public.grades
FOR INSERT
TO authenticated
WITH CHECK (
  school_id IN (
    SELECT profiles.school_id
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
  )
);

-- Permettre aux enseignants de modifier des notes pour leur école
CREATE POLICY "Teachers can update grades"
ON public.grades
FOR UPDATE
TO authenticated
USING (
  school_id IN (
    SELECT profiles.school_id
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
  )
);

-- Permettre aux enseignants de supprimer des notes pour leur école
CREATE POLICY "Teachers can delete grades"
ON public.grades
FOR DELETE
TO authenticated
USING (
  school_id IN (
    SELECT profiles.school_id
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
  )
);