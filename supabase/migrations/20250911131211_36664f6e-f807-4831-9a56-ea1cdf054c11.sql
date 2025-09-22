-- Ensure schedules table has all required fields for timetable functionality
-- Add any missing columns to existing schedules table
ALTER TABLE public.schedules 
ADD COLUMN IF NOT EXISTS activity_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_schedules_class_day ON public.schedules (class_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON public.schedules (teacher_id);

-- Add updated_at trigger for schedules table
DROP TRIGGER IF EXISTS update_schedules_updated_at ON public.schedules;
CREATE TRIGGER update_schedules_updated_at
    BEFORE UPDATE ON public.schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();