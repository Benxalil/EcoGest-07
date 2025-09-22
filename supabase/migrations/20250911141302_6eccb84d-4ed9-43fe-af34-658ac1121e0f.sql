-- Add place_of_birth column to students table
ALTER TABLE public.students 
ADD COLUMN place_of_birth TEXT;