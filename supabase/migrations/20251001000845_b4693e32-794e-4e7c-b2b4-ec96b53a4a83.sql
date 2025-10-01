-- Add missing RLS policies for schools table

-- Policy to allow users to view their school data
CREATE POLICY "Users can view their school data" ON public.schools
  FOR SELECT
  USING (
    id IN (
      SELECT school_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy to allow school admins to update their school
CREATE POLICY "School admins can update their school" ON public.schools
  FOR UPDATE
  USING (
    id IN (
      SELECT school_id 
      FROM public.profiles 
      WHERE id = auth.uid() 
        AND role = 'school_admin'
    )
  );