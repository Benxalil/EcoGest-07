import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

interface SchoolSettings {
  studentMatriculeFormat: string;
  parentMatriculeFormat: string;
  defaultStudentPassword: string;
  defaultParentPassword: string;
  autoGenerateStudentMatricule: boolean;
  autoGenerateParentMatricule: boolean;
}

const DEFAULT_SETTINGS: SchoolSettings = {
  studentMatriculeFormat: 'ELEVE',
  parentMatriculeFormat: 'PAR',
  defaultStudentPassword: 'student123',
  defaultParentPassword: 'parent123',
  autoGenerateStudentMatricule: true,
  autoGenerateParentMatricule: true,
};

export const useSchoolSettings = () => {
  const { userProfile } = useUserRole();
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.schoolId) return;

    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('student_matricule_format, parent_matricule_format, default_student_password, default_parent_password, auto_generate_student_matricule, auto_generate_parent_matricule')
          .eq('id', userProfile.schoolId)
          .single();

        if (error) throw error;

        setSettings({
          studentMatriculeFormat: data.student_matricule_format || DEFAULT_SETTINGS.studentMatriculeFormat,
          parentMatriculeFormat: data.parent_matricule_format || DEFAULT_SETTINGS.parentMatriculeFormat,
          defaultStudentPassword: data.default_student_password || DEFAULT_SETTINGS.defaultStudentPassword,
          defaultParentPassword: data.default_parent_password || DEFAULT_SETTINGS.defaultParentPassword,
          autoGenerateStudentMatricule: data.auto_generate_student_matricule ?? DEFAULT_SETTINGS.autoGenerateStudentMatricule,
          autoGenerateParentMatricule: data.auto_generate_parent_matricule ?? DEFAULT_SETTINGS.autoGenerateParentMatricule,
        });
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [userProfile?.schoolId]);

  const updateSettings = async (newSettings: Partial<SchoolSettings>) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('schools')
        .update({
          student_matricule_format: newSettings.studentMatriculeFormat,
          parent_matricule_format: newSettings.parentMatriculeFormat,
          default_student_password: newSettings.defaultStudentPassword,
          default_parent_password: newSettings.defaultParentPassword,
          auto_generate_student_matricule: newSettings.autoGenerateStudentMatricule,
          auto_generate_parent_matricule: newSettings.autoGenerateParentMatricule,
        })
        .eq('id', userProfile.schoolId);

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...newSettings }));
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres:', error);
      return false;
    }
  };

  return { settings, loading, updateSettings };
};
