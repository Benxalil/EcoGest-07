-- Étape 1: Vérifier si la table existe déjà
DO $$
BEGIN
    -- Supprimer la table si elle existe (pour repartir à zéro)
    DROP TABLE IF EXISTS payments CASCADE;
    
    -- Créer la table payments
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
    
    RAISE NOTICE 'Table payments créée avec succès';
END $$;
