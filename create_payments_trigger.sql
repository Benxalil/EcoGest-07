-- Étape 3: Créer la fonction et le trigger pour updated_at
DO $$
BEGIN
    -- Créer une fonction pour mettre à jour updated_at
    CREATE OR REPLACE FUNCTION update_payments_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Supprimer le trigger existant s'il existe
    DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;

    -- Créer le trigger pour updated_at
    CREATE TRIGGER update_payments_updated_at
        BEFORE UPDATE ON payments
        FOR EACH ROW
        EXECUTE FUNCTION update_payments_updated_at();
    
    RAISE NOTICE 'Fonction et trigger créés avec succès';
END $$;
