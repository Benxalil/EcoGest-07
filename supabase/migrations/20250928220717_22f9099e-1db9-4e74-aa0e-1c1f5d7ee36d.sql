-- Add slogan column to schools table for centralized school information
ALTER TABLE public.schools 
ADD COLUMN slogan TEXT DEFAULT 'Excellence et Innovation';

-- Update existing schools to have a default slogan if they don't have one
UPDATE public.schools 
SET slogan = 'Excellence et Innovation' 
WHERE slogan IS NULL;