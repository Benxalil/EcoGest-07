-- Add publication status to exams table
ALTER TABLE public.exams 
ADD COLUMN is_published boolean DEFAULT false NOT NULL;

-- Add index for better performance on published exams
CREATE INDEX idx_exams_is_published ON public.exams(is_published);

-- Add comment for clarity
COMMENT ON COLUMN public.exams.is_published IS 'Indicates if exam results are published and visible to students and parents';