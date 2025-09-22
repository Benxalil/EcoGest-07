-- Drop the existing foreign key constraint that references auth.users
ALTER TABLE public.schools 
DROP CONSTRAINT IF EXISTS schools_created_by_fkey;

-- Add new foreign key constraint that references public.profiles instead
-- This ensures the reference exists since profiles are created automatically during signup
ALTER TABLE public.schools 
ADD CONSTRAINT schools_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;