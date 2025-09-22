-- Add academic_year field to schools table
ALTER TABLE public.schools 
ADD COLUMN academic_year TEXT NOT NULL DEFAULT '2024/2025';