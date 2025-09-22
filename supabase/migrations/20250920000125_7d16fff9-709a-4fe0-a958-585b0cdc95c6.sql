-- Update RLS policies on profiles table to allow initial profile creation
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles for new users" ON public.profiles;

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Allow system (trigger) to insert profiles for new users with SECURITY DEFINER
CREATE POLICY "System can insert profiles for new users" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);