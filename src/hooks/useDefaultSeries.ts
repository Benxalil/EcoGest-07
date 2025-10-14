import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CacheStaleTime, QueryKeys } from '@/lib/queryClient';

export interface DefaultSeries {
  id: string;
  code: string;
  name: string;
  description?: string;
}

const fetchDefaultSeries = async (): Promise<DefaultSeries[]> => {
  const { data, error } = await supabase
    .from('default_series')
    .select('*')
    .eq('is_active', true)
    .order('code');

  if (error) throw error;
  return data || [];
};

export const useDefaultSeries = () => {
  const { data: series = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['default_series'],
    queryFn: fetchDefaultSeries,
    staleTime: 5 * 60 * 1000, // 5 minutes - données rarement modifiées
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Utilise le cache si disponible
  });

  return { 
    series, 
    loading, 
    error: error instanceof Error ? error.message : null, 
    refetch 
  };
};
