-- Create a trigger function to automatically publish exams when grades are added
CREATE OR REPLACE FUNCTION auto_publish_exam_on_grade_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-publish the exam when the first grade is added
    UPDATE exams 
    SET is_published = true, updated_at = now()
    WHERE id = NEW.exam_id 
      AND is_published = false;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_publish_exam ON grades;
CREATE TRIGGER trigger_auto_publish_exam
    AFTER INSERT ON grades
    FOR EACH ROW
    WHEN (NEW.exam_id IS NOT NULL)
    EXECUTE FUNCTION auto_publish_exam_on_grade_insert();