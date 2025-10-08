-- Fix RLS policies for school registration
-- This allows new users to create schools during registration

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Allow school registration" ON public.schools;

-- Create more permissive policy for school registration
-- This allows authenticated users to insert schools where they are the creator
CREATE POLICY "Allow authenticated users to register schools" 
ON public.schools
FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Ensure school logo bucket exists and is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'school-logos';

-- Update storage policies to allow uploads during registration
DROP POLICY IF EXISTS "School logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload school logos" ON storage.objects;

CREATE POLICY "School logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'school-logos');

CREATE POLICY "Authenticated users can upload school logos" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'school-logos');