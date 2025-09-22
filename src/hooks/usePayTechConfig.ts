import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PayTechConfig {
  id?: string;
  encrypted_api_key: string;
  encrypted_secret_key: string;
  environment: 'sandbox' | 'production';
  is_active: boolean;
}

export const usePayTechConfig = () => {
  const [config, setConfig] = useState<PayTechConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('payment_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setConfig(data ? {
        id: data.id,
        encrypted_api_key: data.encrypted_api_key,
        encrypted_secret_key: data.encrypted_secret_key,
        environment: data.environment as 'sandbox' | 'production',
        is_active: data.is_active
      } : null);
    } catch (err) {
      console.error('Erreur lors de la récupération de la configuration PayTech:', err);
      setError('Impossible de récupérer la configuration PayTech');
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = () => {
    return config && 
           config.encrypted_api_key && 
           config.encrypted_secret_key && 
           config.is_active;
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    loading,
    error,
    isConfigured: isConfigured(),
    refetch: fetchConfig
  };
};