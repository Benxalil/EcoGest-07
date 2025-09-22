-- Créer la table des séries par défaut
CREATE TABLE public.default_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer la table des libellés par défaut
CREATE TABLE public.default_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer les séries par défaut
INSERT INTO public.default_series (code, name, description) VALUES
('L', 'Littérature et sciences humaines', 'Série littéraire générale'),
('L1', 'Langues et Philosophie', 'Option langues et philosophie'),
('L2', 'Sciences humaines : Histoire, Géographie, Économie', 'Option sciences humaines'),
('S1', 'Mathématiques et Sciences Physiques', 'Option mathématiques et physique'),
('S2', 'Sciences expérimentales : Sciences de la Vie et de la Terre, Physique-Chimie', 'Option sciences expérimentales'),
('S3', 'Mathématiques et Sciences Naturelles', 'Option mathématiques et sciences naturelles'),
('T1', 'Techniques industrielles : mécanique, électrotechnique, etc.', 'Option techniques industrielles'),
('T2', 'Techniques administratives et de gestion', 'Option techniques administratives'),
('T3', 'Sciences et technologies : informatique, électronique, etc.', 'Option sciences et technologies'),
('G', 'Sciences de gestion et économie', 'Option gestion et économie'),
('G1', 'Économie et gestion administrative', 'Option économie et gestion'),
('G2', 'Économie et techniques quantitatives', 'Option économie et techniques'),
('E', 'Sciences de l''éducation et pédagogie', 'Option éducation et pédagogie');

-- Insérer les libellés par défaut
INSERT INTO public.default_labels (code, name) VALUES
('A', 'A'),
('B', 'B'),
('C', 'C'),
('D', 'D'),
('E', 'E');

-- Activer RLS
ALTER TABLE public.default_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_labels ENABLE ROW LEVEL SECURITY;

-- Politiques RLS - Lecture pour tous
CREATE POLICY "Everyone can view default series" ON public.default_series FOR SELECT USING (is_active = true);
CREATE POLICY "Everyone can view default labels" ON public.default_labels FOR SELECT USING (is_active = true);
