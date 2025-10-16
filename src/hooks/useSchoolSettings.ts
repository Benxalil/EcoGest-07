import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from './use-toast';

interface SchoolSettings {
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

const DEFAULT_SETTINGS: SchoolSettings = {
  studentMatriculeFormat: 'ELEVE',
  parentMatriculeFormat: 'PAR',
  teacherMatriculeFormat: 'PROF',
  defaultStudentPassword: 'student123',
  defaultParentPassword: 'parent123',
  defaultTeacherPassword: 'teacher123',
  autoGenerateStudentMatricule: true,
  autoGenerateParentMatricule: true,
  autoGenerateTeacherMatricule: true,
};

export const useSchoolSettings = () => {
  const { userProfile } = useUserRole();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.schoolId) return;

    console.log('📊 [useSchoolSettings] Chargement des paramètres pour l\'école:', userProfile.schoolId);

    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('student_matricule_format, parent_matricule_format, teacher_matricule_format, default_student_password, default_parent_password, default_teacher_password, auto_generate_student_matricule, auto_generate_parent_matricule, auto_generate_teacher_matricule')
          .eq('id', userProfile.schoolId)
          .single();

        if (error) throw error;

        const loadedSettings = {
          studentMatriculeFormat: data.student_matricule_format || DEFAULT_SETTINGS.studentMatriculeFormat,
          parentMatriculeFormat: data.parent_matricule_format || DEFAULT_SETTINGS.parentMatriculeFormat,
          teacherMatriculeFormat: data.teacher_matricule_format || DEFAULT_SETTINGS.teacherMatriculeFormat,
          defaultStudentPassword: data.default_student_password || DEFAULT_SETTINGS.defaultStudentPassword,
          defaultParentPassword: data.default_parent_password || DEFAULT_SETTINGS.defaultParentPassword,
          defaultTeacherPassword: data.default_teacher_password || DEFAULT_SETTINGS.defaultTeacherPassword,
          autoGenerateStudentMatricule: data.auto_generate_student_matricule ?? DEFAULT_SETTINGS.autoGenerateStudentMatricule,
          autoGenerateParentMatricule: data.auto_generate_parent_matricule ?? DEFAULT_SETTINGS.autoGenerateParentMatricule,
          autoGenerateTeacherMatricule: data.auto_generate_teacher_matricule ?? DEFAULT_SETTINGS.autoGenerateTeacherMatricule,
        };

        console.log('✅ [useSchoolSettings] Paramètres chargés:', loadedSettings);
        setSettings(loadedSettings);
      } catch (error) {
        console.error('❌ [useSchoolSettings] Erreur lors du chargement des paramètres:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    // Souscrire aux changements en temps réel de la table schools
    console.log('🔔 [useSchoolSettings] Souscription aux changements Realtime...');
    const channel = supabase
      .channel('schools-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'schools',
          filter: `id=eq.${userProfile.schoolId}`
        },
        (payload) => {
          console.log('🔔 [useSchoolSettings] Mise à jour temps réel détectée', payload);
          
          const newData = payload.new;
          const updatedSettings = {
            studentMatriculeFormat: newData.student_matricule_format || DEFAULT_SETTINGS.studentMatriculeFormat,
            parentMatriculeFormat: newData.parent_matricule_format || DEFAULT_SETTINGS.parentMatriculeFormat,
            teacherMatriculeFormat: newData.teacher_matricule_format || DEFAULT_SETTINGS.teacherMatriculeFormat,
            defaultStudentPassword: newData.default_student_password || DEFAULT_SETTINGS.defaultStudentPassword,
            defaultParentPassword: newData.default_parent_password || DEFAULT_SETTINGS.defaultParentPassword,
            defaultTeacherPassword: newData.default_teacher_password || DEFAULT_SETTINGS.defaultTeacherPassword,
            autoGenerateStudentMatricule: newData.auto_generate_student_matricule ?? DEFAULT_SETTINGS.autoGenerateStudentMatricule,
            autoGenerateParentMatricule: newData.auto_generate_parent_matricule ?? DEFAULT_SETTINGS.autoGenerateParentMatricule,
            autoGenerateTeacherMatricule: newData.auto_generate_teacher_matricule ?? DEFAULT_SETTINGS.autoGenerateTeacherMatricule,
          };
          
          setSettings(updatedSettings);
          
          // Émettre l'événement pour notifier les autres composants
          window.dispatchEvent(new CustomEvent('schoolSettingsUpdated'));
          
          // Notification visuelle de synchronisation
          toast({
            title: "🔄 Paramètres synchronisés",
            description: "Les paramètres ont été mis à jour automatiquement",
            duration: 2000,
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 [useSchoolSettings] Statut souscription Realtime:', status);
      });

    return () => {
      console.log('🔌 [useSchoolSettings] Désouscription Realtime');
      supabase.removeChannel(channel);
    };
  }, [userProfile?.schoolId, toast]);

  const updateSettings = async (newSettings: Partial<SchoolSettings>) => {
    if (!userProfile?.schoolId) return false;

    console.log('💾 [useSchoolSettings] Mise à jour optimiste des paramètres:', newSettings);

    // 1️⃣ Sauvegarder l'état précédent pour rollback
    const previousSettings = { ...settings };
    
    // 2️⃣ Mise à jour optimiste IMMÉDIATE de l'état local
    setSettings(prev => ({ ...prev, ...newSettings }));
    
    // 3️⃣ Émettre l'événement IMMÉDIATEMENT pour synchroniser les autres onglets
    window.dispatchEvent(new CustomEvent('schoolSettingsUpdated'));
    
    // 4️⃣ Notification immédiate
    toast({
      title: "✅ Paramètres en cours de sauvegarde...",
      description: "Vos modifications sont en train d'être enregistrées",
      duration: 2000,
    });

    // 5️⃣ Mise à jour de la base de données en arrière-plan
    try {
      const { error } = await supabase
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
        .eq('id', userProfile.schoolId);

      if (error) throw error;

      console.log('✅ [useSchoolSettings] Paramètres sauvegardés en base de données');
      return true;
    } catch (error) {
      console.error('❌ [useSchoolSettings] Erreur lors de la mise à jour:', error);
      
      // 6️⃣ Rollback en cas d'erreur
      setSettings(previousSettings);
      window.dispatchEvent(new CustomEvent('schoolSettingsUpdated'));
      
      toast({
        title: "❌ Erreur de sauvegarde",
        description: "Impossible de sauvegarder les paramètres. Modifications annulées.",
        variant: "destructive",
      });
      
      return false;
    }
  };

  return { settings, loading, updateSettings };
};
