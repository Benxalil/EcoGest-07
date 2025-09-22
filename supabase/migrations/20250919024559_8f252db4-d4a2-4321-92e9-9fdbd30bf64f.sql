-- Add school_type enum if not exists
DO $$ BEGIN
    CREATE TYPE school_type AS ENUM ('public', 'private', 'semi_private', 'international');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add currency enum if not exists  
DO $$ BEGIN
    CREATE TYPE currency_type AS ENUM ('FCFA', 'EUR', 'USD', 'MAD', 'GNF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS school_type school_type DEFAULT 'public',
ADD COLUMN IF NOT EXISTS creation_year integer DEFAULT 2024,
ADD COLUMN IF NOT EXISTS currency currency_type DEFAULT 'FCFA',
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Africa/Dakar',
ADD COLUMN IF NOT EXISTS sponsor_name text,
ADD COLUMN IF NOT EXISTS sponsor_phone text,
ADD COLUMN IF NOT EXISTS sponsor_email text;