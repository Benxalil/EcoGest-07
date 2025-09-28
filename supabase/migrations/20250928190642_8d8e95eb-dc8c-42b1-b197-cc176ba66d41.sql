-- Auto-publish exams that have grades but are not published
UPDATE exams 
SET is_published = true, updated_at = now()
WHERE is_published = false 
  AND id IN (
    SELECT DISTINCT exam_id 
    FROM grades 
    WHERE exam_id IS NOT NULL
  );