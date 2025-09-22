-- Migration complète pour toutes les tables nécessaires
-- Exécuter ce script dans Supabase SQL Editor

-- 1. Créer la table lesson_logs
CREATE TABLE IF NOT EXISTS public.lesson_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  content TEXT,
  lesson_date DATE NOT NULL,
  start_time TIME NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Créer la table subjects si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  abbreviation TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (school_id, name, class_id)
);

-- 3. Créer la table schedules si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  teacher TEXT,
  day TEXT NOT NULL CHECK (day IN ('LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (class_id, day, start_time, end_time)
);

-- 4. Créer la table announcements si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Créer la table payment_categories si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.payment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Créer la table payments si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.payment_categories(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Créer la table exams si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_marks DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Créer la table grades si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer les index pour de meilleures performances
CREATE INDEX IF NOT EXISTS idx_lesson_logs_class_id ON public.lesson_logs(class_id);
CREATE INDEX IF NOT EXISTS idx_lesson_logs_school_id ON public.lesson_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_lesson_logs_lesson_date ON public.lesson_logs(lesson_date);

CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON public.subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);

CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON public.schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_school_id ON public.schedules(school_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day ON public.schedules(day);

CREATE INDEX IF NOT EXISTS idx_announcements_school_id ON public.announcements(school_id);

CREATE INDEX IF NOT EXISTS idx_payment_categories_school_id ON public.payment_categories(school_id);

CREATE INDEX IF NOT EXISTS idx_payments_school_id ON public.payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);

CREATE INDEX IF NOT EXISTS idx_exams_school_id ON public.exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON public.exams(class_id);

CREATE INDEX IF NOT EXISTS idx_grades_school_id ON public.grades(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.grades(student_id);

-- Activer Row Level Security sur toutes les tables
ALTER TABLE public.lesson_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour lesson_logs
CREATE POLICY "Allow school_admin and teacher to view lesson_logs" ON public.lesson_logs
  FOR SELECT USING (school_id = public.get_user_school_id());

CREATE POLICY "Allow school_admin and teacher to insert lesson_logs" ON public.lesson_logs
  FOR INSERT WITH CHECK (school_id = public.get_user_school_id());

CREATE POLICY "Allow school_admin and teacher to update lesson_logs" ON public.lesson_logs
  FOR UPDATE USING (school_id = public.get_user_school_id());

CREATE POLICY "Allow school_admin and teacher to delete lesson_logs" ON public.lesson_logs
  FOR DELETE USING (school_id = public.get_user_school_id());

-- Politiques RLS pour subjects
CREATE POLICY "Allow school_admin and teacher to view subjects" ON public.subjects
  FOR SELECT USING (school_id = public.get_user_school_id());

CREATE POLICY "Allow school_admin to insert subjects" ON public.subjects
  FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

CREATE POLICY "Allow school_admin to update subjects" ON public.subjects
  FOR UPDATE USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

CREATE POLICY "Allow school_admin to delete subjects" ON public.subjects
  FOR DELETE USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

-- Politiques RLS pour schedules
CREATE POLICY "Allow school_admin and teacher to view schedules" ON public.schedules
  FOR SELECT USING (school_id = public.get_user_school_id());

CREATE POLICY "Allow school_admin to insert schedules" ON public.schedules
  FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

CREATE POLICY "Allow school_admin to update schedules" ON public.schedules
  FOR UPDATE USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

CREATE POLICY "Allow school_admin to delete schedules" ON public.schedules
  FOR DELETE USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

-- Politiques RLS pour announcements
CREATE POLICY "Allow school_admin and teacher to view announcements" ON public.announcements
  FOR SELECT USING (school_id = public.get_user_school_id());

CREATE POLICY "Allow school_admin to insert announcements" ON public.announcements
  FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

CREATE POLICY "Allow school_admin to update announcements" ON public.announcements
  FOR UPDATE USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

CREATE POLICY "Allow school_admin to delete announcements" ON public.announcements
  FOR DELETE USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

-- Politiques RLS pour payment_categories
CREATE POLICY "Allow school_admin to view payment_categories" ON public.payment_categories
  FOR SELECT USING (school_id = public.get_user_school_id());

CREATE POLICY "Allow school_admin to insert payment_categories" ON public.payment_categories
  FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

CREATE POLICY "Allow school_admin to update payment_categories" ON public.payment_categories
  FOR UPDATE USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

CREATE POLICY "Allow school_admin to delete payment_categories" ON public.payment_categories
  FOR DELETE USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

-- Politiques RLS pour payments
CREATE POLICY "Allow school_admin and teacher to view payments" ON public.payments
  FOR SELECT USING (school_id = public.get_user_school_id());

CREATE POLICY "Allow school_admin to insert payments" ON public.payments
  FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

CREATE POLICY "Allow school_admin to update payments" ON public.payments
  FOR UPDATE USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

CREATE POLICY "Allow school_admin to delete payments" ON public.payments
  FOR DELETE USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

-- Politiques RLS pour exams
CREATE POLICY "Allow school_admin and teacher to view exams" ON public.exams
  FOR SELECT USING (school_id = public.get_user_school_id());

CREATE POLICY "Allow school_admin to insert exams" ON public.exams
  FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

CREATE POLICY "Allow school_admin to update exams" ON public.exams
  FOR UPDATE USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

CREATE POLICY "Allow school_admin to delete exams" ON public.exams
  FOR DELETE USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'school_admin');

-- Politiques RLS pour grades
CREATE POLICY "Allow school_admin and teacher to view grades" ON public.grades
  FOR SELECT USING (school_id = public.get_user_school_id());

CREATE POLICY "Allow school_admin and teacher to insert grades" ON public.grades
  FOR INSERT WITH CHECK (school_id = public.get_user_school_id());

CREATE POLICY "Allow school_admin and teacher to update grades" ON public.grades
  FOR UPDATE USING (school_id = public.get_user_school_id());

CREATE POLICY "Allow school_admin and teacher to delete grades" ON public.grades
  FOR DELETE USING (school_id = public.get_user_school_id());

-- Message de confirmation
SELECT 'Migration complète terminée avec succès !' as status;
