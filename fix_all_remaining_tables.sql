-- Script de migration complet pour toutes les tables manquantes
-- À exécuter dans Supabase SQL Editor

-- 1. Table subjects (matières)
CREATE TABLE IF NOT EXISTS subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abbreviation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table lesson_logs (cahier de texte)
CREATE TABLE IF NOT EXISTS lesson_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  lesson_date DATE NOT NULL,
  start_time TIME NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table announcements (annonces)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table payment_categories (catégories de paiement)
CREATE TABLE IF NOT EXISTS payment_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table payments (paiements)
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  category_id UUID REFERENCES payment_categories(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Table exams (examens)
CREATE TABLE IF NOT EXISTS exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  total_marks DECIMAL(5,2),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table grades (notes)
CREATE TABLE IF NOT EXISTS grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  marks_obtained DECIMAL(5,2) NOT NULL,
  max_marks DECIMAL(5,2) NOT NULL,
  grade TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer tous les index nécessaires
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_lesson_logs_class_id ON lesson_logs(class_id);
CREATE INDEX IF NOT EXISTS idx_lesson_logs_school_id ON lesson_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_school_id ON announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_payment_categories_school_id ON payment_categories(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_school_id ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_school_id ON exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_exam_id ON grades(exam_id);
CREATE INDEX IF NOT EXISTS idx_grades_school_id ON grades(school_id);

-- Activer RLS sur toutes les tables
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- Créer des politiques RLS simples pour toutes les tables
-- Subjects
CREATE POLICY "subjects_select_policy" ON subjects FOR SELECT USING (true);
CREATE POLICY "subjects_insert_policy" ON subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "subjects_update_policy" ON subjects FOR UPDATE USING (true);
CREATE POLICY "subjects_delete_policy" ON subjects FOR DELETE USING (true);

-- Lesson logs
CREATE POLICY "lesson_logs_select_policy" ON lesson_logs FOR SELECT USING (true);
CREATE POLICY "lesson_logs_insert_policy" ON lesson_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "lesson_logs_update_policy" ON lesson_logs FOR UPDATE USING (true);
CREATE POLICY "lesson_logs_delete_policy" ON lesson_logs FOR DELETE USING (true);

-- Announcements
CREATE POLICY "announcements_select_policy" ON announcements FOR SELECT USING (true);
CREATE POLICY "announcements_insert_policy" ON announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "announcements_update_policy" ON announcements FOR UPDATE USING (true);
CREATE POLICY "announcements_delete_policy" ON announcements FOR DELETE USING (true);

-- Payment categories
CREATE POLICY "payment_categories_select_policy" ON payment_categories FOR SELECT USING (true);
CREATE POLICY "payment_categories_insert_policy" ON payment_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "payment_categories_update_policy" ON payment_categories FOR UPDATE USING (true);
CREATE POLICY "payment_categories_delete_policy" ON payment_categories FOR DELETE USING (true);

-- Payments
CREATE POLICY "payments_select_policy" ON payments FOR SELECT USING (true);
CREATE POLICY "payments_insert_policy" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "payments_update_policy" ON payments FOR UPDATE USING (true);
CREATE POLICY "payments_delete_policy" ON payments FOR DELETE USING (true);

-- Exams
CREATE POLICY "exams_select_policy" ON exams FOR SELECT USING (true);
CREATE POLICY "exams_insert_policy" ON exams FOR INSERT WITH CHECK (true);
CREATE POLICY "exams_update_policy" ON exams FOR UPDATE USING (true);
CREATE POLICY "exams_delete_policy" ON exams FOR DELETE USING (true);

-- Grades
CREATE POLICY "grades_select_policy" ON grades FOR SELECT USING (true);
CREATE POLICY "grades_insert_policy" ON grades FOR INSERT WITH CHECK (true);
CREATE POLICY "grades_update_policy" ON grades FOR UPDATE USING (true);
CREATE POLICY "grades_delete_policy" ON grades FOR DELETE USING (true);

-- Vérifier que toutes les tables ont été créées
SELECT 'Toutes les tables créées avec succès' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('subjects', 'lesson_logs', 'announcements', 'payment_categories', 'payments', 'exams', 'grades');
