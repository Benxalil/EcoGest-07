-- Script pour corriger la table payments
-- Ajouter la colonne payment_date si elle n'existe pas

DO $$
BEGIN
    -- Vérifier si la colonne payment_date existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'payment_date'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la colonne payment_date
        ALTER TABLE payments 
        ADD COLUMN payment_date DATE NOT NULL DEFAULT CURRENT_DATE;
        
        RAISE NOTICE 'Colonne payment_date ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne payment_date existe déjà';
    END IF;
    
    -- Vérifier si la colonne amount existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'amount'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la colonne amount
        ALTER TABLE payments 
        ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0);
        
        RAISE NOTICE 'Colonne amount ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne amount existe déjà';
    END IF;
    
    -- Vérifier si la colonne payment_method existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'payment_method'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la colonne payment_method
        ALTER TABLE payments 
        ADD COLUMN payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash';
        
        RAISE NOTICE 'Colonne payment_method ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne payment_method existe déjà';
    END IF;
    
    -- Vérifier si la colonne payment_type existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'payment_type'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la colonne payment_type
        ALTER TABLE payments 
        ADD COLUMN payment_type VARCHAR(50) NOT NULL DEFAULT 'mensualite';
        
        RAISE NOTICE 'Colonne payment_type ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne payment_type existe déjà';
    END IF;
    
    -- Vérifier si la colonne payment_month existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'payment_month'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la colonne payment_month
        ALTER TABLE payments 
        ADD COLUMN payment_month VARCHAR(20);
        
        RAISE NOTICE 'Colonne payment_month ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne payment_month existe déjà';
    END IF;
    
    -- Vérifier si la colonne paid_by existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'paid_by'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la colonne paid_by
        ALTER TABLE payments 
        ADD COLUMN paid_by VARCHAR(50) NOT NULL DEFAULT 'parent';
        
        RAISE NOTICE 'Colonne paid_by ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne paid_by existe déjà';
    END IF;
    
    -- Vérifier si la colonne phone_number existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'phone_number'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la colonne phone_number
        ALTER TABLE payments 
        ADD COLUMN phone_number VARCHAR(20);
        
        RAISE NOTICE 'Colonne phone_number ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne phone_number existe déjà';
    END IF;
    
    -- Vérifier si la colonne school_id existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'school_id'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la colonne school_id
        ALTER TABLE payments 
        ADD COLUMN school_id UUID NOT NULL;
        
        RAISE NOTICE 'Colonne school_id ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne school_id existe déjà';
    END IF;
    
    -- Vérifier si la colonne student_id existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'student_id'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la colonne student_id
        ALTER TABLE payments 
        ADD COLUMN student_id UUID NOT NULL;
        
        RAISE NOTICE 'Colonne student_id ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne student_id existe déjà';
    END IF;
    
    -- Vérifier si la colonne created_at existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'created_at'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la colonne created_at
        ALTER TABLE payments 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'Colonne created_at ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne created_at existe déjà';
    END IF;
    
    -- Vérifier si la colonne updated_at existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la colonne updated_at
        ALTER TABLE payments 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'Colonne updated_at ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne updated_at existe déjà';
    END IF;
    
END $$;

-- Afficher la structure finale de la table
SELECT 'Structure de la table payments:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND table_schema = 'public'
ORDER BY ordinal_position;
