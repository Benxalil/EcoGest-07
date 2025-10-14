import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CacheStaleTime, QueryKeys } from '@/lib/queryClient';

export interface DefaultLabel {
  id: string;
  code: string;
  name: string;
}

const fetchDefaultLabels = async (): Promise<DefaultLabel[]> => {
  const { data, error } = await supabase
    .from('default_labels')
    .select('*')
    .eq('is_active', true)
    .order('code');

  if (error) throw error;
  return data || [];
};

export const useDefaultLabels = () => {
  const { data: labels = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['default_labels'],
    queryFn: fetchDefaultLabels,
    staleTime: 5 * 60 * 1000, // 5 minutes - données rarement modifiées
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Utilise le cache si disponible
  });

  return { 
    labels, 
    loading, 
    error: error instanceof Error ? error.message : null, 
    refetch 
  };
};
