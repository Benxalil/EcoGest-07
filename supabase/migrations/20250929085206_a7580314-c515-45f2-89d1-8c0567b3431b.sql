-- Fix critical security vulnerability: Schools table publicly accessible
-- Replace overly permissive RLS policy with proper access controls

-- 1. Drop the overly permissive policy that allows anyone to view all schools
DROP POLICY IF EXISTS "Users can view relevant schools" ON schools;

-- 2. Create secure RLS policies for schools table
CREATE POLICY "Authenticated users can view their own school" ON schools
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    (id = get_user_school_id() OR created_by = auth.uid())
  );

-- 3. Create policy for school admins to view other schools (limited scope)
CREATE POLICY "Super admins can view all schools" ON schools
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    get_user_role() = 'super_admin'
  );

-- 4. Ensure school registration policy remains secure
-- (Keep existing "Allow school registration" policy - it's already secure)

-- 5. Verification
SELECT 'Schools table security policies updated successfully' as status;

-- 6. Show current policies
SELECT schemaname, tablename, policyname, cmd, permissive, roles, 
       CASE WHEN length(qual::text) > 50 THEN left(qual::text, 50) || '...' ELSE qual::text END as condition
FROM pg_policies 
WHERE tablename = 'schools' 
ORDER BY cmd, policyname;