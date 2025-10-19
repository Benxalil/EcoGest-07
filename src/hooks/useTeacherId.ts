import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useQuery } from '@tanstack/react-query';
import { QueryKeys, CacheStaleTime } from '@/lib/queryClient';

export const useTeacherId = () => {
  const { userProfile } = useUserRole();

  const { data: teacherId, isLoading: loading } = useQuery({
    queryKey: QueryKeys.teacher(userProfile?.id || ''),
    queryFn: async () => {
      if (!userProfile?.id || !userProfile?.schoolId) return null;

      const { data, error } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', userProfile.id)
        .eq('school_id', userProfile.schoolId)
        .maybeSingle();

      if (error) throw error;
      return data?.id || null;
    },
    staleTime: CacheStaleTime.TEACHERS,
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!userProfile?.id && !!userProfile?.schoolId,
  });

  return { teacherId: teacherId || null, loading };
};
