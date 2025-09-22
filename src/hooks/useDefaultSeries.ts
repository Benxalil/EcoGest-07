import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DefaultSeries {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export const useDefaultSeries = () => {
  const [series, setSeries] = useState<DefaultSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('default_series')
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      setSeries(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des séries:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries();
  }, []);

  return { series, loading, error, refetch: fetchSeries };
};
