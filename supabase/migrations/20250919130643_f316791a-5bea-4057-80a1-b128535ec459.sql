-- Fix the RLS policy for school creation during registration
-- The issue is that the profile might not exist yet when trying to insert the school
DROP POLICY IF EXISTS "Allow school creation during registration" ON public.schools;

CREATE POLICY "Allow school creation during registration" 
ON public.schools 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow insertion if user doesn't have a profile yet (new registration)
  -- OR if user has a profile but no school_id yet
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND school_id IS NOT NULL
  )
);