import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';
import { unifiedCache, CacheTTL } from '@/utils/unifiedCache';

const CACHE_TTL = CacheTTL.DYNAMIC; // 2 minutes

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

// Alias for backwards compatibility
export type LessonLog = LessonLogData;

export const useLessonLogs = (classId?: string, teacherId?: string | null) => {
  const [lessonLogs, setLessonLogs] = useState<LessonLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  const fetchLessonLogs = useCallback(async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    const cacheKey = `lesson_logs_${classId || 'all'}_${teacherId || 'all'}`;
    
    // Vérifier le cache d'abord
    const cached = unifiedCache.get<LessonLogData[]>(cacheKey);
    if (cached) {
      setLessonLogs(cached);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('lesson_logs')
        .select('id, class_id, subject_id, teacher_id, topic, content, lesson_date, start_time, end_time, school_id, created_at, updated_at')
        .eq('school_id', userProfile.schoolId)
        .order('lesson_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (classId) {
        query = query.eq('class_id', classId);
      }

      // Filtrer par enseignant si teacherId est fourni
      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLessonLogs(data || []);
      unifiedCache.set(cacheKey, data || [], CACHE_TTL);
    } catch (err) {
      console.error('Erreur lors de la récupération des journaux de cours:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.schoolId, classId, teacherId]);

  const createLessonLog = async (lessonLogData: Omit<LessonLogData, 'id' | 'school_id' | 'created_at' | 'updated_at'>) => {
    if (!userProfile?.schoolId) return false;

    try {
      // 1️⃣ Créer une entrée temporaire avec ID local
      const tempId = `temp-${Date.now()}`;
      const tempLog: LessonLogData = {
        id: tempId,
        ...lessonLogData,
        school_id: userProfile.schoolId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 2️⃣ Mise à jour optimiste immédiate
      setLessonLogs(prev => [tempLog, ...prev]);

      // 3️⃣ Toast immédiat
      toast({ title: "✅ Journal de cours créé avec succès" });

      // 4️⃣ Insertion réelle en base (arrière-plan)
      const { data: insertedLog, error } = await supabase
        .from('lesson_logs')
        .insert({
          ...lessonLogData,
          school_id: userProfile.schoolId,
        })
        .select()
        .single();

      if (error) throw error;

      // 5️⃣ Remplacer l'entrée temporaire par la vraie
      setLessonLogs(prev => 
        prev.map(log => log.id === tempId ? insertedLog : log)
      );

      return true;
    } catch (err) {
      console.error('Erreur lors de la création du journal de cours:', err);
      
      // 6️⃣ Rollback : supprimer l'entrée temporaire
      setLessonLogs(prev => prev.filter(log => !log.id.startsWith('temp-')));
      
      toast({ 
        title: "❌ Erreur lors de la création du journal de cours", 
        description: err instanceof Error ? err.message : "Une erreur est survenue.", 
        variant: "destructive" 
      });
      return false;
    }
  };

  const updateLessonLog = async (id: string, lessonLogData: Partial<Omit<LessonLogData, 'id' | 'school_id' | 'created_at' | 'updated_at'>>) => {
    if (!userProfile?.schoolId) return false;

    // 1️⃣ Sauvegarder l'état précédent pour rollback
    const previousLogs = lessonLogs;

    try {
      // 2️⃣ Mise à jour optimiste immédiate
      setLessonLogs(prev => 
        prev.map(log => 
          log.id === id 
            ? { ...log, ...lessonLogData, updated_at: new Date().toISOString() }
            : log
        )
      );

      // 3️⃣ Toast immédiat
      toast({ title: "✅ Journal de cours mis à jour avec succès" });

      // 4️⃣ Mise à jour réelle en base (arrière-plan)
      const { error } = await supabase
        .from('lesson_logs')
        .update(lessonLogData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du journal de cours:', err);
      
      // 5️⃣ Rollback
      setLessonLogs(previousLogs);
      
      toast({ 
        title: "❌ Erreur lors de la mise à jour du journal de cours", 
        description: err instanceof Error ? err.message : "Une erreur est survenue.", 
        variant: "destructive" 
      });
      return false;
    }
  };

  const deleteLessonLog = async (id: string) => {
    if (!userProfile?.schoolId) return false;

    // 1️⃣ Sauvegarder pour rollback
    const previousLogs = lessonLogs;

    try {
      // 2️⃣ Suppression optimiste immédiate
      setLessonLogs(prev => prev.filter(log => log.id !== id));

      // 3️⃣ Toast immédiat
      toast({ title: "✅ Journal de cours supprimé avec succès" });

      // 4️⃣ Suppression réelle en base (arrière-plan)
      const { error } = await supabase
        .from('lesson_logs')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression du journal de cours:', err);
      
      // 5️⃣ Rollback
      setLessonLogs(previousLogs);
      
      toast({ 
        title: "❌ Erreur lors de la suppression du journal de cours", 
        description: err instanceof Error ? err.message : "Une erreur est survenue.", 
        variant: "destructive" 
      });
      return false;
    }
  };

  useEffect(() => {
    void fetchLessonLogs();
  }, [fetchLessonLogs]);

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