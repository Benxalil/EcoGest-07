-- Add created_by column to schools table to link school to the user who created it
ALTER TABLE public.schools 
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update existing schools to set created_by (if any exist, they'll need manual assignment)
-- For now, we'll leave them NULL and handle in the application

-- Drop and recreate RLS policies to use the new created_by column
DROP POLICY IF EXISTS "Allow authenticated users to create schools" ON public.schools;
DROP POLICY IF EXISTS "Users can view their own school" ON public.schools;
DROP POLICY IF EXISTS "School admins can update their school" ON public.schools;

-- Allow authenticated users to create schools (with created_by = auth.uid())
CREATE POLICY "Allow authenticated users to create schools" 
ON public.schools 
FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Allow users to view schools they created or are associated with
CREATE POLICY "Users can view their own school" 
ON public.schools 
FOR SELECT 
TO authenticated
USING (
  created_by = auth.uid() 
  OR id = get_user_school_id()
  OR get_user_school_id() IS NULL
);

-- School creators and admins can update their school
CREATE POLICY "School admins can update their school" 
ON public.schools 
FOR UPDATE 
TO authenticated
USING (
  (created_by = auth.uid()) 
  OR (id = get_user_school_id() AND get_user_role() = ANY (ARRAY['school_admin'::user_role, 'super_admin'::user_role]))
);