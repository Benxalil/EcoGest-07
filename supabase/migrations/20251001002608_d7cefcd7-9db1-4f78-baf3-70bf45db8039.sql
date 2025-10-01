-- Migration pour restaurer l'accès aux données
-- Ajout des politiques RLS manquantes pour toutes les tables critiques

-- ==========================================
-- TABLES DASHBOARD (Priorité Critique)
-- ==========================================

-- 1. CLASSES
CREATE POLICY "Users can view classes from their school" ON classes
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can insert classes" ON classes
  FOR INSERT WITH CHECK (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "School admins can update classes" ON classes
  FOR UPDATE USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "School admins can delete classes" ON classes
  FOR DELETE USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 2. STUDENTS
CREATE POLICY "Users can view students from their school" ON students
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can insert students" ON students
  FOR INSERT WITH CHECK (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "School admins can update students" ON students
  FOR UPDATE USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "School admins can delete students" ON students
  FOR DELETE USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 3. TEACHERS
CREATE POLICY "Users can view teachers from their school" ON teachers
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can insert teachers" ON teachers
  FOR INSERT WITH CHECK (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "School admins can update teachers" ON teachers
  FOR UPDATE USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "School admins can delete teachers" ON teachers
  FOR DELETE USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 4. SUBJECTS
CREATE POLICY "Users can view subjects from their school" ON subjects
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can insert subjects" ON subjects
  FOR INSERT WITH CHECK (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "School admins can update subjects" ON subjects
  FOR UPDATE USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "School admins can delete subjects" ON subjects
  FOR DELETE USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 5. ANNOUNCEMENTS
CREATE POLICY "Users can view announcements from their school" ON announcements
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can insert announcements" ON announcements
  FOR INSERT WITH CHECK (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "School admins can update announcements" ON announcements
  FOR UPDATE USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "School admins can delete announcements" ON announcements
  FOR DELETE USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- ==========================================
-- TABLES DE SUPPORT
-- ==========================================

-- 6. ACADEMIC_YEARS
CREATE POLICY "Users can view academic years from their school" ON academic_years
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can manage academic years" ON academic_years
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 7. GRADES
CREATE POLICY "Users can view grades from their school" ON grades
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can manage grades" ON grades
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 8. SCHEDULES
CREATE POLICY "Users can view schedules from their school" ON schedules
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can manage schedules" ON schedules
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 9. LESSON_LOGS
CREATE POLICY "Users can view lesson logs from their school" ON lesson_logs
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Teachers can manage lesson logs" ON lesson_logs
  FOR ALL USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

-- 10. ATTENDANCES
CREATE POLICY "Users can view attendances from their school" ON attendances
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can manage attendances" ON attendances
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 11. PAYMENT_CATEGORIES
CREATE POLICY "Users can view payment categories from their school" ON payment_categories
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can manage payment categories" ON payment_categories
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 12. STUDENT_DOCUMENTS
CREATE POLICY "Users can view student documents from their school" ON student_documents
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can manage student documents" ON student_documents
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 13. TEACHER_SUBJECTS
CREATE POLICY "Users can view teacher subjects from their school" ON teacher_subjects
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can manage teacher subjects" ON teacher_subjects
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 14. SERIES
CREATE POLICY "Users can view series from their school" ON series
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can manage series" ON series
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 15. CLASS_LABELS
CREATE POLICY "Users can view class labels from their school" ON class_labels
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can manage class labels" ON class_labels
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 16. PAYMENT_CONFIG
CREATE POLICY "School admins can view payment config" ON payment_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "School admins can manage payment config" ON payment_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 17. SUBSCRIPTIONS
CREATE POLICY "School admins can view subscriptions for their school" ON subscriptions
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "School admins can manage subscriptions" ON subscriptions
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 18. PAYMENT_TRANSACTIONS
CREATE POLICY "School admins can view payment transactions for their school" ON payment_transactions
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 19. STUDENT_GRADES
CREATE POLICY "Users can view student grades from their school" ON student_grades
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "School admins can manage student grades" ON student_grades
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

-- 20. SCHOOL_USER_COUNTERS
CREATE POLICY "School admins can view counters for their school" ON school_user_counters
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );

CREATE POLICY "School admins can manage counters" ON school_user_counters
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM profiles 
      WHERE id = auth.uid() AND role = 'school_admin'
    )
  );