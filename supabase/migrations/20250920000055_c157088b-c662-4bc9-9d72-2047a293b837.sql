-- Create the missing trigger to automatically create profiles when users sign up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies on profiles table to allow initial profile creation
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Also allow the system to insert profiles for new users (for the trigger)
CREATE POLICY "System can insert profiles for new users" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);