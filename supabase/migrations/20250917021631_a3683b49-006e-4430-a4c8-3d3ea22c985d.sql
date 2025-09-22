-- Remove the dangerous policies that make school data publicly accessible
DROP POLICY IF EXISTS "Allow reading schools for testing" ON public.schools;
DROP POLICY IF EXISTS "Allow schools for testing" ON public.schools;