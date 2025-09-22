-- Create more permissive RLS policies for testing without authentication

-- Allow creating profiles for testing (needed for test user creation)
CREATE POLICY "Allow creating profiles for testing" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- Allow reading all profiles for testing (needed for profile lookups)
CREATE POLICY "Allow reading profiles for testing" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Allow updating profiles for testing
CREATE POLICY "Allow updating profiles for testing" 
ON public.profiles 
FOR UPDATE 
USING (true);

-- Allow creating schools for testing
CREATE POLICY "Allow creating schools for testing" 
ON public.schools 
FOR INSERT 
WITH CHECK (true);

-- Allow creating students for testing  
CREATE POLICY "Allow creating students for testing" 
ON public.students 
FOR INSERT 
WITH CHECK (true);

-- Allow reading students for testing
CREATE POLICY "Allow reading students for testing" 
ON public.students 
FOR SELECT 
USING (true);

-- Allow updating students for testing
CREATE POLICY "Allow updating students for testing" 
ON public.students 
FOR UPDATE 
USING (true);

-- Create test school if it doesn't exist
INSERT INTO public.schools (id, name, academic_year, subscription_status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'École de Test',
  '2024/2025', 
  'trial'
) ON CONFLICT (id) DO NOTHING;

-- Create test admin profile if it doesn't exist
INSERT INTO public.profiles (id, first_name, last_name, email, role, school_id)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Admin',
  'Test',
  'admin@test.com',
  'school_admin',
  '11111111-1111-1111-1111-111111111111'
) ON CONFLICT (id) DO NOTHING;