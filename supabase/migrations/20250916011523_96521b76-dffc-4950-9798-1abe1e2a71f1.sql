-- Create more permissive RLS policies for testing without authentication

-- Allow creating and reading announcements for testing
CREATE POLICY "Allow announcements for testing" 
ON public.announcements 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Allow creating and reading students for testing  
CREATE POLICY "Allow students for testing" 
ON public.students 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Allow creating schools for testing
CREATE POLICY "Allow schools for testing" 
ON public.schools 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Allow creating classes for testing
CREATE POLICY "Allow classes for testing" 
ON public.classes 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Allow creating subjects for testing
CREATE POLICY "Allow subjects for testing" 
ON public.subjects 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create test school if it doesn't exist
INSERT INTO public.schools (id, name, academic_year, subscription_status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'École de Test',
  '2024/2025', 
  'trial'
) ON CONFLICT (id) DO NOTHING;