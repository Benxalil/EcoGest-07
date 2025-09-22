-- Script pour ajouter les colonnes nécessaires à la gestion des rôles et permissions
-- pour les notes et examens

-- 1. Ajouter les colonnes subjects et classes à la table users
DO $$
BEGIN
    -- Ajouter la colonne subjects si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'subjects') THEN
        ALTER TABLE users ADD COLUMN subjects JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Ajouter la colonne classes si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'classes') THEN
        ALTER TABLE users ADD COLUMN classes JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Ajouter la colonne role si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'teacher';
    END IF;
END $$;

-- 2. Créer une table de liaison pour les matières des enseignants
CREATE TABLE IF NOT EXISTS teacher_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, subject_id)
);

-- 3. Créer une table de liaison pour les classes des enseignants
CREATE TABLE IF NOT EXISTS teacher_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, class_id)
);

-- 4. Créer des index pour de meilleures performances
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher_id ON teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject_id ON teacher_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher_id ON teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class_id ON teacher_classes(class_id);

-- 5. Créer des fonctions pour gérer les permissions
CREATE OR REPLACE FUNCTION get_teacher_subjects(teacher_uuid UUID)
RETURNS TABLE(subject_id UUID, subject_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.name
    FROM subjects s
    INNER JOIN teacher_subjects ts ON s.id = ts.subject_id
    WHERE ts.teacher_id = teacher_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_teacher_classes(teacher_uuid UUID)
RETURNS TABLE(class_id UUID, class_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name
    FROM classes c
    INNER JOIN teacher_classes tc ON c.id = tc.class_id
    WHERE tc.teacher_id = teacher_uuid;
END;
$$ LANGUAGE plpgsql;

-- 6. Créer des vues pour faciliter les requêtes
CREATE OR REPLACE VIEW teacher_permissions AS
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    COALESCE(
        json_agg(
            json_build_object(
                'id', s.id,
                'name', s.name
            )
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'::json
    ) as subjects,
    COALESCE(
        json_agg(
            json_build_object(
                'id', c.id,
                'name', c.name
            )
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::json
    ) as classes
FROM users u
LEFT JOIN teacher_subjects ts ON u.id = ts.teacher_id
LEFT JOIN subjects s ON ts.subject_id = s.id
LEFT JOIN teacher_classes tc ON u.id = tc.teacher_id
LEFT JOIN classes c ON tc.class_id = c.id
WHERE u.role IN ('teacher', 'admin', 'director')
GROUP BY u.id, u.email, u.role;

-- 7. Insérer des données de test pour les administrateurs
UPDATE users 
SET role = 'admin' 
WHERE email LIKE '%admin%' OR email LIKE '%director%';

-- 8. Créer des triggers pour maintenir la cohérence des données
CREATE OR REPLACE FUNCTION update_user_subjects_classes()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour la colonne subjects dans users
    UPDATE users 
    SET subjects = (
        SELECT json_agg(json_build_object('id', s.id, 'name', s.name))
        FROM subjects s
        INNER JOIN teacher_subjects ts ON s.id = ts.subject_id
        WHERE ts.teacher_id = NEW.teacher_id
    )
    WHERE id = NEW.teacher_id;
    
    -- Mettre à jour la colonne classes dans users
    UPDATE users 
    SET classes = (
        SELECT json_agg(json_build_object('id', c.id, 'name', c.name))
        FROM classes c
        INNER JOIN teacher_classes tc ON c.id = tc.class_id
        WHERE tc.teacher_id = NEW.teacher_id
    )
    WHERE id = NEW.teacher_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers
DROP TRIGGER IF EXISTS trigger_update_user_subjects ON teacher_subjects;
CREATE TRIGGER trigger_update_user_subjects
    AFTER INSERT OR UPDATE OR DELETE ON teacher_subjects
    FOR EACH ROW EXECUTE FUNCTION update_user_subjects_classes();

DROP TRIGGER IF EXISTS trigger_update_user_classes ON teacher_classes;
CREATE TRIGGER trigger_update_user_classes
    AFTER INSERT OR UPDATE OR DELETE ON teacher_classes
    FOR EACH ROW EXECUTE FUNCTION update_user_subjects_classes();
