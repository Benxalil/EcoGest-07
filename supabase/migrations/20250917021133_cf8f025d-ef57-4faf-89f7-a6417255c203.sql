-- Remove the dangerous policy that makes student data publicly accessible
DROP POLICY IF EXISTS "Allow students for testing" ON public.students;