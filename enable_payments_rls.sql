-- Étape 2: Activer RLS et créer les politiques
DO $$
BEGIN
    -- Activer RLS (Row Level Security)
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
    
    -- Supprimer les politiques existantes si elles existent
    DROP POLICY IF EXISTS "Users can view payments from their school" ON payments;
    DROP POLICY IF EXISTS "Users can insert payments for their school" ON payments;
    DROP POLICY IF EXISTS "Users can update payments from their school" ON payments;
    DROP POLICY IF EXISTS "Users can delete payments from their school" ON payments;
    
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
    
    RAISE NOTICE 'RLS activé et politiques créées avec succès';
END $$;
