-- Exécuter cette migration dans Supabase SQL Editor
-- Création de la table lesson_logs

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

-- Index pour de meilleures performances
CREATE INDEX IF NOT EXISTS idx_lesson_logs_class_id ON public.lesson_logs(class_id);
CREATE INDEX IF NOT EXISTS idx_lesson_logs_school_id ON public.lesson_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_lesson_logs_lesson_date ON public.lesson_logs(lesson_date);

-- Activer Row Level Security
ALTER TABLE public.lesson_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour lesson_logs
CREATE POLICY "Allow school_admin and teacher to view lesson_logs" ON public.lesson_logs
  FOR SELECT USING (
    school_id = public.get_user_school_id()
  );

CREATE POLICY "Allow school_admin and teacher to insert lesson_logs" ON public.lesson_logs
  FOR INSERT WITH CHECK (
    school_id = public.get_user_school_id()
  );

CREATE POLICY "Allow school_admin and teacher to update lesson_logs" ON public.lesson_logs
  FOR UPDATE USING (
    school_id = public.get_user_school_id()
  );

CREATE POLICY "Allow school_admin and teacher to delete lesson_logs" ON public.lesson_logs
  FOR DELETE USING (
    school_id = public.get_user_school_id()
  );
