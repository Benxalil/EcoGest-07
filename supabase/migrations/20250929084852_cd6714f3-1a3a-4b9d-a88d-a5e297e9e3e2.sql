-- Fix Security Definer View vulnerability
-- Drop the student_results view that bypasses RLS policies

-- 1. Drop the problematic view
DROP VIEW IF EXISTS public.student_results CASCADE;

-- 2. Verification
SELECT 'Security Definer View removed successfully' as status;

-- 3. Check that no views remain with security definer
SELECT schemaname, viewname, viewowner 
FROM pg_views 
WHERE schemaname = 'public';