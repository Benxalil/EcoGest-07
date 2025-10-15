import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Exam {
  id: string;
  school_id: string;
  class_id: string;
  subject_id?: string;
  title: string;
  exam_date: string;
  start_time?: string;
  end_time?: string;
  total_marks?: number;
  is_published: boolean;
  semester?: string;
  created_at: string;
  updated_at: string;
  classes?: {
    id: string;
    name: string;
    level: string;
    section?: string;
  };
}

export interface CreateExamData {
  class_id: string;
  subject_id?: string;
  title: string;
  exam_date: string;
  start_time?: string;
  end_time?: string;
  total_marks?: number;
  is_published?: boolean;
  semester?: string;
}

export const useExams = (classId?: string) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  const fetchExams = useCallback(async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const query = supabase
        .from('exams')
        .select(`
          *,
          classes(
            id,
            name,
            level,
            section
          )
        `)
        .eq('school_id', userProfile.schoolId);

      if (classId) {
        query.eq('class_id', classId);
      }

      const { data, error } = await query.order('exam_date', { ascending: false });

      if (error) throw error;
      
      setExams(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des examens:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.schoolId, classId]);

  const createExam = async (examData: CreateExamData) => {
    if (!userProfile?.schoolId) return false;

    const tempId = `temp-${Date.now()}`;
    let optimisticExam: Exam | null = null;

    try {
      // Mise à jour optimiste
      optimisticExam = {
        id: tempId,
        school_id: userProfile.schoolId,
        class_id: examData.class_id,
        subject_id: examData.subject_id || null,
        title: examData.title,
        exam_date: examData.exam_date,
        start_time: examData.start_time,
        end_time: undefined,
        total_marks: examData.total_marks,
        is_published: examData.is_published ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setExams(prev => [optimisticExam!, ...prev]);

      const { data, error } = await supabase
        .from('exams')
        .insert({
          class_id: examData.class_id,
          subject_id: examData.subject_id || null,
          teacher_id: null,
          title: examData.title,
          exam_date: examData.exam_date,
          start_time: examData.start_time,
          duration_minutes: examData.total_marks ? examData.total_marks * 6 : 120,
          total_points: examData.total_marks,
          is_published: false, // TOUJOURS dépublié par défaut lors de la création
          semester: examData.semester,
          school_id: userProfile.schoolId
        })
        .select(`
          *,
          classes(
            id,
            name,
            level,
            section
          )
        `)
        .single();

      if (error) throw error;

      // Remplacer l'élément optimiste par le réel
      setExams(prev => prev.map(e => e.id === tempId ? data : e));

      toast({
        title: "Examen créé avec succès",
        description: "L'examen a été créé et sauvegardé.",
      });

      return true;
    } catch (err) {
      // Rollback en cas d'erreur
      if (optimisticExam) {
        setExams(prev => prev.filter(e => e.id !== tempId));
      }

      console.error('Erreur lors de la création de l\'examen:', err);
      toast({
        title: "Erreur lors de la création",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la création de l'examen.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateExam = async (id: string, examData: Partial<CreateExamData>) => {
    if (!userProfile?.schoolId) return false;

    const previousState = exams.find(e => e.id === id);

    try {
      // Mise à jour optimiste
      setExams(prev => prev.map(e => 
        e.id === id ? { ...e, ...examData, updated_at: new Date().toISOString() } : e
      ));

      const { error } = await supabase
        .from('exams')
        .update(examData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      toast({
        title: "Examen mis à jour",
        description: "L'examen a été mis à jour avec succès.",
      });

      return true;
    } catch (err) {
      // Rollback en cas d'erreur
      if (previousState) {
        setExams(prev => prev.map(e => e.id === id ? previousState : e));
      }

      console.error('Erreur lors de la mise à jour de l\'examen:', err);
      toast({
        title: "Erreur lors de la mise à jour",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteExam = async (id: string) => {
    if (!userProfile?.schoolId) return false;

    const previousState = exams.find(e => e.id === id);

    try {
      // Suppression optimiste
      setExams(prev => prev.filter(e => e.id !== id));

      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      toast({
        title: "Examen supprimé",
        description: "L'examen a été supprimé avec succès.",
      });

      return true;
    } catch (err) {
      // Rollback en cas d'erreur
      if (previousState) {
        setExams(prev => [...prev, previousState]);
      }

      console.error('Erreur lors de la suppression de l\'examen:', err);
      toast({
        title: "Erreur lors de la suppression",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // Realtime synchronization
  useEffect(() => {
    if (!userProfile?.schoolId) return;

    const channel: RealtimeChannel = supabase
      .channel('exams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exams',
          filter: `school_id=eq.${userProfile.schoolId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Récupérer les données complètes avec la classe
            const { data } = await supabase
              .from('exams')
              .select(`
                *,
                classes(
                  id,
                  name,
                  level,
                  section
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setExams(prev => {
                const exists = prev.some(e => e.id === data.id);
                if (exists) return prev;
                return [data, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            // Récupérer les données complètes avec la classe
            const { data } = await supabase
              .from('exams')
              .select(`
                *,
                classes(
                  id,
                  name,
                  level,
                  section
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setExams(prev => prev.map(e => 
                e.id === data.id ? data : e
              ));
            }
          } else if (payload.eventType === 'DELETE') {
            setExams(prev => prev.filter(e => e.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.schoolId]);

  return {
    exams,
    loading,
    error,
    createExam,
    updateExam,
    deleteExam,
    refreshExams: fetchExams
  };
};
