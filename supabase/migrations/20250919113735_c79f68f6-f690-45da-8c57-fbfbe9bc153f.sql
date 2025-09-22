-- Correction des politiques RLS trop permissives et renforcement de l'isolation des données

-- 1. Supprimer les policies de test trop permissives
DROP POLICY IF EXISTS "Allow announcements for testing" ON public.announcements;
DROP POLICY IF EXISTS "Allow creating announcements for testing" ON public.announcements;
DROP POLICY IF EXISTS "Allow classes for testing" ON public.classes;
DROP POLICY IF EXISTS "Allow subjects for testing" ON public.subjects;

-- 2. Créer des policies strictes pour les annonces
CREATE POLICY "School admins and teachers can manage announcements" 
ON public.announcements 
FOR ALL 
USING ((school_id = get_user_school_id()) AND (get_user_role() = ANY (ARRAY['school_admin'::user_role, 'teacher'::user_role, 'super_admin'::user_role])));

CREATE POLICY "Users can view published announcements in their school" 
ON public.announcements 
FOR SELECT 
USING ((school_id = get_user_school_id()) AND (is_published = true OR get_user_role() = ANY (ARRAY['school_admin'::user_role, 'teacher'::user_role, 'super_admin'::user_role])));

-- 3. Améliorer les policies pour les classes
DROP POLICY IF EXISTS "Admins and teachers can manage classes" ON public.classes;
CREATE POLICY "School admins can manage classes" 
ON public.classes 
FOR ALL 
USING ((school_id = get_user_school_id()) AND (get_user_role() = ANY (ARRAY['school_admin'::user_role, 'super_admin'::user_role])));

CREATE POLICY "Teachers can view classes in their school" 
ON public.classes 
FOR SELECT 
USING ((school_id = get_user_school_id()) AND (get_user_role() = ANY (ARRAY['teacher'::user_role, 'school_admin'::user_role, 'super_admin'::user_role])));

-- 4. Améliorer les policies pour les matières
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "School admins can manage subjects" 
ON public.subjects 
FOR ALL 
USING ((school_id = get_user_school_id()) AND (get_user_role() = ANY (ARRAY['school_admin'::user_role, 'super_admin'::user_role])));

-- 5. Créer une fonction pour initialiser une nouvelle école avec des données de base
CREATE OR REPLACE FUNCTION public.initialize_new_school(
  school_id_param uuid,
  school_type_param school_type DEFAULT 'public',
  academic_year_name_param text DEFAULT '2024/2025'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Créer l'année académique par défaut
  INSERT INTO public.academic_years (
    school_id,
    name,
    start_date,
    end_date,
    is_current
  ) VALUES (
    school_id_param,
    academic_year_name_param,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '12 months',
    true
  );

  -- Créer les matières de base selon le type d'école
  IF school_type_param = 'primary' THEN
    INSERT INTO public.subjects (school_id, name, code, coefficient, color) VALUES
    (school_id_param, 'Français', 'FR', 4, '#FF6B6B'),
    (school_id_param, 'Mathématiques', 'MATH', 4, '#4ECDC4'),
    (school_id_param, 'Sciences', 'SCI', 2, '#45B7D1'),
    (school_id_param, 'Histoire-Géographie', 'HG', 2, '#FFA07A'),
    (school_id_param, 'Éducation Physique', 'EPS', 1, '#98D8C8');
  ELSIF school_type_param = 'secondary' THEN
    INSERT INTO public.subjects (school_id, name, code, coefficient, color) VALUES
    (school_id_param, 'Français', 'FR', 4, '#FF6B6B'),
    (school_id_param, 'Mathématiques', 'MATH', 4, '#4ECDC4'),
    (school_id_param, 'Physique-Chimie', 'PC', 3, '#45B7D1'),
    (school_id_param, 'SVT', 'SVT', 2, '#95E1A3'),
    (school_id_param, 'Histoire-Géographie', 'HG', 3, '#FFA07A'),
    (school_id_param, 'Anglais', 'ANG', 3, '#F7DC6F'),
    (school_id_param, 'Philosophie', 'PHILO', 3, '#BB8FCE'),
    (school_id_param, 'Éducation Physique', 'EPS', 1, '#98D8C8');
  ELSE
    -- École publique générale - matières mixtes
    INSERT INTO public.subjects (school_id, name, code, coefficient, color) VALUES
    (school_id_param, 'Français', 'FR', 4, '#FF6B6B'),
    (school_id_param, 'Mathématiques', 'MATH', 4, '#4ECDC4'),
    (school_id_param, 'Sciences', 'SCI', 2, '#45B7D1'),
    (school_id_param, 'Histoire-Géographie', 'HG', 2, '#FFA07A'),
    (school_id_param, 'Anglais', 'ANG', 2, '#F7DC6F'),
    (school_id_param, 'Éducation Physique', 'EPS', 1, '#98D8C8');
  END IF;

  -- Créer les catégories de paiement de base
  INSERT INTO public.payment_categories (school_id, name, description, amount, is_recurring) VALUES
  (school_id_param, 'Frais de scolarité', 'Frais de scolarité mensuel', 50000, true),
  (school_id_param, 'Frais d''inscription', 'Frais d''inscription annuel', 25000, false),
  (school_id_param, 'Frais de transport', 'Frais de transport mensuel', 10000, true);

END;
$$;

-- 6. Créer une fonction pour vérifier l'isolation des données par école
CREATE OR REPLACE FUNCTION public.validate_school_isolation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_school_id uuid;
BEGIN
  -- Récupérer l'ID de l'école de l'utilisateur
  user_school_id := get_user_school_id();
  
  -- Si l'utilisateur n'a pas d'école assignée, interdire l'accès
  IF user_school_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 7. Ajouter des contraintes pour renforcer l'isolation
-- Trigger pour vérifier l'isolation avant insertion/mise à jour
CREATE OR REPLACE FUNCTION public.check_school_isolation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_school_id uuid;
BEGIN
  -- Récupérer l'ID de l'école de l'utilisateur
  user_school_id := get_user_school_id();
  
  -- Vérifier que l'école dans les données correspond à celle de l'utilisateur
  IF NEW.school_id != user_school_id THEN
    RAISE EXCEPTION 'Accès interdit : violation de l''isolation des données entre écoles';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Appliquer le trigger aux principales tables avec school_id
CREATE TRIGGER enforce_school_isolation_students
  BEFORE INSERT OR UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.check_school_isolation();

CREATE TRIGGER enforce_school_isolation_teachers
  BEFORE INSERT OR UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.check_school_isolation();

CREATE TRIGGER enforce_school_isolation_classes
  BEFORE INSERT OR UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.check_school_isolation();

CREATE TRIGGER enforce_school_isolation_subjects
  BEFORE INSERT OR UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.check_school_isolation();