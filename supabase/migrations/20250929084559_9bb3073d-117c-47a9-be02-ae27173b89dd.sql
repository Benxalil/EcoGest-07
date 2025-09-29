-- Fix critical security vulnerability: Student documents publicly accessible
-- Replace overly permissive RLS policies with proper access controls

-- 1. Drop existing overly permissive policies on student_documents
DROP POLICY IF EXISTS "student_documents_select_policy" ON student_documents;
DROP POLICY IF EXISTS "student_documents_insert_policy" ON student_documents;
DROP POLICY IF EXISTS "student_documents_update_policy" ON student_documents;
DROP POLICY IF EXISTS "student_documents_delete_policy" ON student_documents;

-- 2. Create secure RLS policies for student_documents
CREATE POLICY "School staff can view student documents" ON student_documents
  FOR SELECT USING (
    school_id = get_user_school_id() AND
    get_user_role() IN ('school_admin', 'teacher', 'super_admin')
  );

CREATE POLICY "School staff can insert student documents" ON student_documents
  FOR INSERT WITH CHECK (
    school_id = get_user_school_id() AND
    get_user_role() IN ('school_admin', 'teacher', 'super_admin')
  );

CREATE POLICY "School staff can update student documents" ON student_documents
  FOR UPDATE USING (
    school_id = get_user_school_id() AND
    get_user_role() IN ('school_admin', 'teacher', 'super_admin')
  );

CREATE POLICY "School staff can delete student documents" ON student_documents
  FOR DELETE USING (
    school_id = get_user_school_id() AND
    get_user_role() IN ('school_admin', 'teacher', 'super_admin')
  );

-- 3. Fix grades table security (also has public access)
DROP POLICY IF EXISTS "Allow all users to view grades" ON grades;
DROP POLICY IF EXISTS "Allow all users to insert grades" ON grades;
DROP POLICY IF EXISTS "Allow all users to update grades" ON grades;
DROP POLICY IF EXISTS "Allow all users to delete grades" ON grades;

CREATE POLICY "School staff can view grades" ON grades
  FOR SELECT USING (
    school_id = get_user_school_id() AND
    get_user_role() IN ('school_admin', 'teacher', 'super_admin')
  );

CREATE POLICY "School staff can insert grades" ON grades
  FOR INSERT WITH CHECK (
    school_id = get_user_school_id() AND
    get_user_role() IN ('school_admin', 'teacher', 'super_admin')
  );

CREATE POLICY "School staff can update grades" ON grades
  FOR UPDATE USING (
    school_id = get_user_school_id() AND
    get_user_role() IN ('school_admin', 'teacher', 'super_admin')
  );

CREATE POLICY "School staff can delete grades" ON grades
  FOR DELETE USING (
    school_id = get_user_school_id() AND
    get_user_role() IN ('school_admin', 'teacher', 'super_admin')
  );

-- 4. Fix user_profiles overly permissive policies
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;

CREATE POLICY "Users can view profiles in their school" ON user_profiles
  FOR SELECT USING (
    school_id = get_user_school_id() OR
    id = auth.uid()
  );

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
  );

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (
    id = auth.uid()
  );

CREATE POLICY "School admins can manage profiles" ON user_profiles
  FOR ALL USING (
    school_id = get_user_school_id() AND
    get_user_role() IN ('school_admin', 'super_admin')
  );

-- 5. Fix storage policies for student-files bucket
DROP POLICY IF EXISTS "storage_objects_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_delete_policy" ON storage.objects;

-- Create secure storage policies that restrict access to authorized users only
CREATE POLICY "School staff can view student files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'student-files' AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "School staff can upload student files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'student-files' AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "School staff can update student files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'student-files' AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "School staff can delete student files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'student-files' AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'teacher')
    )
  );

-- 6. Verification queries
SELECT 'Security policies updated successfully' as status;
SELECT schemaname, tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('student_documents', 'grades', 'user_profiles')
ORDER BY tablename, cmd;