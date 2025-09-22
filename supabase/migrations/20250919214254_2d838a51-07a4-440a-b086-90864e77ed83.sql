-- Fix RLS policies for school registration
-- The issue is that during initial registration, the user profile doesn't exist yet
-- so get_user_school_id() returns null, which can cause RLS policy conflicts

-- First, let's update the schools table policies to handle initial registration
DROP POLICY IF EXISTS "Allow authenticated users to create schools" ON public.schools;
DROP POLICY IF EXISTS "Users can view their own school" ON public.schools;
DROP POLICY IF EXISTS "School admins can update their school" ON public.schools;

-- Allow authenticated users to create schools (for initial registration)
CREATE POLICY "Allow authenticated users to create schools" 
ON public.schools 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their own school or if they don't have a school yet (for registration flow)
CREATE POLICY "Users can view their own school" 
ON public.schools 
FOR SELECT 
TO authenticated
USING (
  id = get_user_school_id() 
  OR get_user_school_id() IS NULL
  OR auth.uid() IS NOT NULL
);

-- Only school admins can update their school
CREATE POLICY "School admins can update their school" 
ON public.schools 
FOR UPDATE 
TO authenticated
USING (
  id = get_user_school_id() 
  AND get_user_role() = ANY (ARRAY['school_admin'::user_role, 'super_admin'::user_role])
);

-- Also ensure profiles table allows initial profile creation
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their school" ON public.profiles;
DROP POLICY IF EXISTS "School admins can manage profiles in their school" ON public.profiles;

-- Allow users to insert their own profile (for registration)
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid());

-- Allow users to view profiles in their school
CREATE POLICY "Users can view profiles in their school" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  school_id = get_user_school_id() 
  OR id = auth.uid()
  OR get_user_school_id() IS NULL
);

-- School admins can manage profiles in their school
CREATE POLICY "School admins can manage profiles in their school" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (
  school_id = get_user_school_id() 
  AND get_user_role() = ANY (ARRAY['school_admin'::user_role, 'super_admin'::user_role])
);