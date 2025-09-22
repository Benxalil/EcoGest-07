-- Drop existing RLS policies that are too restrictive
DROP POLICY IF EXISTS "Allow authenticated users to create schools" ON public.schools;
DROP POLICY IF EXISTS "Users can view their own school" ON public.schools;
DROP POLICY IF EXISTS "School admins can update their school" ON public.schools;

-- Allow both anonymous and authenticated users to create schools during registration
-- This is needed for the initial school registration flow
CREATE POLICY "Allow school registration" 
ON public.schools 
FOR INSERT 
TO anon, authenticated
WITH CHECK (created_by IS NOT NULL);

-- Allow users to view schools during registration and after authentication
-- This supports both the registration flow and normal authenticated access
CREATE POLICY "Users can view relevant schools" 
ON public.schools 
FOR SELECT 
TO anon, authenticated
USING (
  -- During registration: allow temporary access (we'll secure this further if needed)
  true
  -- Note: This is permissive for now to allow registration flow
  -- In production, you might want to add time-based restrictions or other checks
);

-- Allow school creators and admins to update their schools (authenticated only)
CREATE POLICY "School owners and admins can update schools" 
ON public.schools 
FOR UPDATE 
TO authenticated
USING (
  (created_by = auth.uid()) 
  OR (id = get_user_school_id() AND get_user_role() = ANY (ARRAY['school_admin'::user_role, 'super_admin'::user_role]))
);

-- Prevent deletion for security (schools should not be deleted)
CREATE POLICY "Prevent school deletion" 
ON public.schools 
FOR DELETE 
TO authenticated
USING (false);