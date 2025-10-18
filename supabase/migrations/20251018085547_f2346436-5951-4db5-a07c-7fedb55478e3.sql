-- Supprimer la colonne parent_email de la table students
ALTER TABLE public.students DROP COLUMN IF EXISTS parent_email;

-- Vérifier que toutes les colonnes nécessaires existent (elles devraient déjà être là)
-- Cette requête ne fait rien si les colonnes existent déjà
DO $$ 
BEGIN
  -- Vérifier les colonnes père
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'father_first_name') THEN
    ALTER TABLE public.students ADD COLUMN father_first_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'father_last_name') THEN
    ALTER TABLE public.students ADD COLUMN father_last_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'father_phone') THEN
    ALTER TABLE public.students ADD COLUMN father_phone text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'father_address') THEN
    ALTER TABLE public.students ADD COLUMN father_address text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'father_status') THEN
    ALTER TABLE public.students ADD COLUMN father_status text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'father_profession') THEN
    ALTER TABLE public.students ADD COLUMN father_profession text;
  END IF;
  
  -- Vérifier les colonnes mère
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'mother_first_name') THEN
    ALTER TABLE public.students ADD COLUMN mother_first_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'mother_last_name') THEN
    ALTER TABLE public.students ADD COLUMN mother_last_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'mother_phone') THEN
    ALTER TABLE public.students ADD COLUMN mother_phone text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'mother_address') THEN
    ALTER TABLE public.students ADD COLUMN mother_address text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'mother_status') THEN
    ALTER TABLE public.students ADD COLUMN mother_status text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'mother_profession') THEN
    ALTER TABLE public.students ADD COLUMN mother_profession text;
  END IF;
  
  -- Vérifier les colonnes médicales
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'has_medical_condition') THEN
    ALTER TABLE public.students ADD COLUMN has_medical_condition boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'medical_condition_type') THEN
    ALTER TABLE public.students ADD COLUMN medical_condition_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'medical_condition_description') THEN
    ALTER TABLE public.students ADD COLUMN medical_condition_description text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'doctor_name') THEN
    ALTER TABLE public.students ADD COLUMN doctor_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'students' AND column_name = 'doctor_phone') THEN
    ALTER TABLE public.students ADD COLUMN doctor_phone text;
  END IF;
END $$;