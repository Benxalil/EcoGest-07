import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';

export interface LessonLogData {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  topic: string;
  content: string;
  lesson_date: string;
  start_time: string;
  school_id: string;
  created_at: string;
  updated_at: string;
}

export const useLessonLogs = (classId?: string) => {
  const [lessonLogs, setLessonLogs] = useState<LessonLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  const fetchLessonLogs = async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('lesson_logs')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .order('lesson_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLessonLogs(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des journaux de cours:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const createLessonLog = async (lessonLogData: Omit<LessonLogData, 'id' | 'school_id' | 'created_at' | 'updated_at'>) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('lesson_logs')
        .insert({
          ...lessonLogData,
          school_id: userProfile.schoolId,
        });

      if (error) throw error;

      await fetchLessonLogs();
      toast({ title: "Journal de cours créé avec succès" });
      return true;
    } catch (err) {
      console.error('Erreur lors de la création du journal de cours:', err);
      toast({ 
        title: "Erreur lors de la création du journal de cours", 
        description: err instanceof Error ? err.message : "Une erreur est survenue.", 
        variant: "destructive" 
      });
      return false;
    }
  };

  const updateLessonLog = async (id: string, lessonLogData: Partial<Omit<LessonLogData, 'id' | 'school_id' | 'created_at' | 'updated_at'>>) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('lesson_logs')
        .update(lessonLogData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      await fetchLessonLogs();
      toast({ title: "Journal de cours mis à jour avec succès" });
      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du journal de cours:', err);
      toast({ 
        title: "Erreur lors de la mise à jour du journal de cours", 
        description: err instanceof Error ? err.message : "Une erreur est survenue.", 
        variant: "destructive" 
      });
      return false;
    }
  };

  const deleteLessonLog = async (id: string) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('lesson_logs')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      await fetchLessonLogs();
      toast({ title: "Journal de cours supprimé avec succès" });
      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression du journal de cours:', err);
      toast({ 
        title: "Erreur lors de la suppression du journal de cours", 
        description: err instanceof Error ? err.message : "Une erreur est survenue.", 
        variant: "destructive" 
      });
      return false;
    }
  };

  useEffect(() => {
    fetchLessonLogs();
  }, [userProfile?.schoolId, classId]);

  return {
    lessonLogs,
    loading,
    error,
    createLessonLog,
    updateLessonLog,
    deleteLessonLog,
    refreshLessonLogs: fetchLessonLogs,
  };
};