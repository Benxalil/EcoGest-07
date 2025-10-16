import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from './use-toast';

interface MatriculeSettings {
  studentMatriculeFormat: string;
  parentMatriculeFormat: string;
  teacherMatriculeFormat: string;
  defaultStudentPassword: string;
  defaultParentPassword: string;
  defaultTeacherPassword: string;
  autoGenerateStudentMatricule: boolean;
  autoGenerateParentMatricule: boolean;
  autoGenerateTeacherMatricule: boolean;
}

export const useMatriculeSettings = () => {
  const { userProfile } = useUserRole();
  const { toast } = useToast();
  const [settings, setSettings] = useState<MatriculeSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // 📥 CHARGER depuis la base de données
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      if (!userProfile?.schoolId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('schools')
          .select(`
            student_matricule_format,
            parent_matricule_format,
            teacher_matricule_format,
            default_student_password,
            default_parent_password,
            default_teacher_password,
            auto_generate_student_matricule,
            auto_generate_parent_matricule,
            auto_generate_teacher_matricule
          `)
          .eq('id', userProfile.schoolId)
          .single();

        if (error) throw error;

        if (isMounted && data) {
          const loadedSettings: MatriculeSettings = {
            studentMatriculeFormat: data.student_matricule_format || 'ELEVE',
            parentMatriculeFormat: data.parent_matricule_format || 'PAR',
            teacherMatriculeFormat: data.teacher_matricule_format || 'PROF',
            defaultStudentPassword: data.default_student_password || 'student123',
            defaultParentPassword: data.default_parent_password || 'parent123',
            defaultTeacherPassword: data.default_teacher_password || 'teacher123',
            autoGenerateStudentMatricule: data.auto_generate_student_matricule ?? true,
            autoGenerateParentMatricule: data.auto_generate_parent_matricule ?? true,
            autoGenerateTeacherMatricule: data.auto_generate_teacher_matricule ?? true,
          };
          
          console.log('✅ [useMatriculeSettings] Chargé depuis DB:', loadedSettings);
          setSettings(loadedSettings);
        }
      } catch (err) {
        if (isMounted) {
          console.error('❌ [useMatriculeSettings] Erreur chargement:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    // 🔔 Realtime pour synchroniser entre fenêtres (seulement si schoolId existe)
    if (!userProfile?.schoolId) {
      return () => {
        isMounted = false;
      };
    }

    const channel = supabase
      .channel('matricule-settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'schools',
          filter: `id=eq.${userProfile.schoolId}`
        },
        (payload) => {
          console.log('🔔 [useMatriculeSettings] Mise à jour détectée', payload);
          if (isMounted && payload.new) {
            const updatedSettings: MatriculeSettings = {
              studentMatriculeFormat: payload.new.student_matricule_format || 'ELEVE',
              parentMatriculeFormat: payload.new.parent_matricule_format || 'PAR',
              teacherMatriculeFormat: payload.new.teacher_matricule_format || 'PROF',
              defaultStudentPassword: payload.new.default_student_password || 'student123',
              defaultParentPassword: payload.new.default_parent_password || 'parent123',
              defaultTeacherPassword: payload.new.default_teacher_password || 'teacher123',
              autoGenerateStudentMatricule: payload.new.auto_generate_student_matricule ?? true,
              autoGenerateParentMatricule: payload.new.auto_generate_parent_matricule ?? true,
              autoGenerateTeacherMatricule: payload.new.auto_generate_teacher_matricule ?? true,
            };
            setSettings(updatedSettings);
            
            toast({
              title: "🔄 Paramètres synchronisés",
              description: "Les formats ont été mis à jour automatiquement",
              duration: 2000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userProfile?.schoolId, toast]);

  // 💾 SAUVEGARDER vers la base de données
  const updateSettings = async (newSettings: Partial<MatriculeSettings>) => {
    if (!userProfile?.schoolId) {
      console.error('❌ [useMatriculeSettings] Pas de schoolId');
      return false;
    }

    try {
      console.log('💾 [useMatriculeSettings] UPDATE en cours...', newSettings);

      const { data, error } = await supabase
        .from('schools')
        .update({
          student_matricule_format: newSettings.studentMatriculeFormat,
          parent_matricule_format: newSettings.parentMatriculeFormat,
          teacher_matricule_format: newSettings.teacherMatriculeFormat,
          default_student_password: newSettings.defaultStudentPassword,
          default_parent_password: newSettings.defaultParentPassword,
          default_teacher_password: newSettings.defaultTeacherPassword,
          auto_generate_student_matricule: newSettings.autoGenerateStudentMatricule,
          auto_generate_parent_matricule: newSettings.autoGenerateParentMatricule,
          auto_generate_teacher_matricule: newSettings.autoGenerateTeacherMatricule,
        })
        .eq('id', userProfile.schoolId)
        .select()
        .single();

      console.log('💾 [useMatriculeSettings] Résultat:', { data, error });

      if (error) {
        throw error;
      }

      if (data) {
        const updatedSettings: MatriculeSettings = {
          studentMatriculeFormat: data.student_matricule_format || 'ELEVE',
          parentMatriculeFormat: data.parent_matricule_format || 'PAR',
          teacherMatriculeFormat: data.teacher_matricule_format || 'PROF',
          defaultStudentPassword: data.default_student_password || 'student123',
          defaultParentPassword: data.default_parent_password || 'parent123',
          defaultTeacherPassword: data.default_teacher_password || 'teacher123',
          autoGenerateStudentMatricule: data.auto_generate_student_matricule ?? true,
          autoGenerateParentMatricule: data.auto_generate_parent_matricule ?? true,
          autoGenerateTeacherMatricule: data.auto_generate_teacher_matricule ?? true,
        };
        
        setSettings(updatedSettings);
        
        toast({
          title: "✅ Paramètres sauvegardés",
          description: "Les formats ont été mis à jour avec succès",
          duration: 3000,
        });
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [useMatriculeSettings] Erreur:', error);
      
      toast({
        title: "❌ Erreur de sauvegarde",
        description: error instanceof Error ? error.message : "Impossible de sauvegarder",
        variant: "destructive",
        duration: 5000,
      });
      
      return false;
    }
  };

  return { settings, loading, updateSettings };
};
