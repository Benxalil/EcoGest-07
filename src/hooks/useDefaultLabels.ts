import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DefaultLabel {
  id: string;
  code: string;
  name: string;
}

export const useDefaultLabels = () => {
  const [labels, setLabels] = useState<DefaultLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLabels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('default_labels')
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      setLabels(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des libellés:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  return { labels, loading, error, refetch: fetchLabels };
};
