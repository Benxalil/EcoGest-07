-- Add language and semester_type enums
CREATE TYPE public.language_type AS ENUM ('french', 'arabic');
CREATE TYPE public.semester_system_type AS ENUM ('semester', 'trimester');

-- Add new fields to schools table
ALTER TABLE public.schools 
ADD COLUMN language language_type DEFAULT 'french',
ADD COLUMN semester_type semester_system_type DEFAULT 'semester';