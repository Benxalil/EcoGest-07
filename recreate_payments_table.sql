-- Script pour recréer complètement la table payments
-- ATTENTION: Ce script supprimera toutes les données existantes

-- Supprimer la table existante et toutes ses dépendances
DROP TABLE IF EXISTS payments CASCADE;

-- Recréer la table payments avec la structure complète
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL,
    payment_type VARCHAR(50) NOT NULL,
    payment_month VARCHAR(20),
    paid_by VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    school_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter les contraintes de clé étrangère
ALTER TABLE payments 
ADD CONSTRAINT fk_payments_student_id 
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE payments 
ADD CONSTRAINT fk_payments_school_id 
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Créer des index pour optimiser les performances
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_school_id ON payments(school_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_payment_month ON payments(payment_month);

-- Créer une contrainte unique pour éviter les doublons de paiement
CREATE UNIQUE INDEX idx_payments_unique_student_month 
ON payments(student_id, payment_month) 
WHERE payment_month IS NOT NULL;

-- Activer RLS (Row Level Security)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "Users can view payments from their school" ON payments
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert payments for their school" ON payments
    FOR INSERT WITH CHECK (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update payments from their school" ON payments
    FOR UPDATE USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete payments from their school" ON payments
    FOR DELETE USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Créer la fonction pour updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour updated_at
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Vérifier la structure finale
SELECT 'Table payments recréée avec succès' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND table_schema = 'public'
ORDER BY ordinal_position;
