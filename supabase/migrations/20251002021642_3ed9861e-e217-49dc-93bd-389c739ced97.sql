-- Add performance indexes to students table
-- These indexes will significantly improve query performance for common filters

-- Index for school_id lookups (most common filter)
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);

-- Composite index for school_id + is_active (very common combination)
CREATE INDEX IF NOT EXISTS idx_students_school_active ON public.students(school_id, is_active);

-- Index for class_id lookups
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);

-- Index for user_id lookups (for profile pages)
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);

-- Composite index for class_id + is_active
CREATE INDEX IF NOT EXISTS idx_students_class_active ON public.students(class_id, is_active);

-- Comment explaining the optimization
COMMENT ON INDEX idx_students_school_active IS 'Optimizes queries filtering by school and active status';
COMMENT ON INDEX idx_students_class_active IS 'Optimizes queries filtering by class and active status';