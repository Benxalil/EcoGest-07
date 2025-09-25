// Simplified classes hook
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export interface ClassData {
  id: string;
  name: string;
  level: string;
  section?: string;
  capacity?: number;
  effectif?: number;
  academic_year_id: string;
  school_id: string;
  created_at: string;
  updated_at: string;
  series_id?: string;
  label_id?: string;
}

export const useOptimizedClasses = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { userProfile } = useUserRole();

  const fetchClasses = async () => {
    if (!userProfile?.schoolId) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await (supabase as any)
        .from('classes')
        .select('*')
        .eq('school_id', userProfile.schoolId);
      
      if (fetchError) throw fetchError;
      setClasses(data || []);
    } catch (err) {
      setError('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const createClass = async (classData: any) => {
    try {
      const { error: createError } = await (supabase as any)
        .from('classes')
        .insert({ ...classData, school_id: userProfile?.schoolId });
      
      if (createError) throw createError;
      await fetchClasses();
      return true;
    } catch (err) {
      return false;
    }
  };

  const updateClass = async (id: string, classData: any) => {
    try {
      const { error: updateError } = await (supabase as any)
        .from('classes')
        .update(classData)
        .eq('id', id);
      
      if (updateError) throw updateError;
      await fetchClasses();
      return true;
    } catch (err) {
      return false;
    }
  };

  const deleteClass = async (id: string) => {
    try {
      const { error: deleteError } = await (supabase as any)
        .from('classes')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      await fetchClasses();
      return true;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [userProfile?.schoolId]);

  return {
    classes,
    loading,
    error,
    fetchClasses,
    createClass,
    updateClass,
    deleteClass,
    refreshClasses: fetchClasses
  };
};