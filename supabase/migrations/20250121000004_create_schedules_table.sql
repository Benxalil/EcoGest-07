-- Créer la table schedules pour les emplois du temps
CREATE TABLE IF NOT EXISTS schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  teacher TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  day TEXT NOT NULL CHECK (day IN ('LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_school_id ON schedules(school_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day ON schedules(day);

-- Activer RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Créer des politiques RLS simples
CREATE POLICY "schedules_select_policy" ON schedules
  FOR SELECT USING (true);

CREATE POLICY "schedules_insert_policy" ON schedules
  FOR INSERT WITH CHECK (true);

CREATE POLICY "schedules_update_policy" ON schedules
  FOR UPDATE USING (true);

CREATE POLICY "schedules_delete_policy" ON schedules
  FOR DELETE USING (true);
