-- Create policy to allow school creation during registration
-- This policy allows authenticated users to insert schools if they don't have a school_id yet
CREATE POLICY "Allow school creation during registration" 
ON public.schools 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow insertion if user doesn't have a school_id in their profile yet
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND school_id IS NOT NULL
  )
);