-- Script complet pour créer la table payments avec toutes les fonctionnalités
-- Exécuter ce script dans l'ordre dans Supabase SQL Editor

-- Étape 1: Créer la table payments
CREATE TABLE IF NOT EXISTS payments (
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

-- Étape 2: Ajouter les contraintes de clé étrangère
ALTER TABLE payments 
ADD CONSTRAINT fk_payments_student_id 
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE payments 
ADD CONSTRAINT fk_payments_school_id 
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Étape 3: Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_school_id ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_month ON payments(payment_month);

-- Étape 4: Créer une contrainte unique pour éviter les doublons de paiement
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_student_month 
ON payments(student_id, payment_month) 
WHERE payment_month IS NOT NULL;

-- Étape 5: Activer RLS (Row Level Security)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Étape 6: Créer les politiques RLS
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

-- Étape 7: Créer la fonction pour updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Étape 8: Créer le trigger pour updated_at
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Vérifier que la table a été créée
SELECT 'Table payments créée avec succès' as status;
