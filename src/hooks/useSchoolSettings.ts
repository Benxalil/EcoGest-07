import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

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
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.schoolId) return;

    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('student_matricule_format, parent_matricule_format, teacher_matricule_format, default_student_password, default_parent_password, default_teacher_password, auto_generate_student_matricule, auto_generate_parent_matricule, auto_generate_teacher_matricule')
          .eq('id', userProfile.schoolId)
          .single();

        if (error) throw error;

        setSettings({
          studentMatriculeFormat: data.student_matricule_format || DEFAULT_SETTINGS.studentMatriculeFormat,
          parentMatriculeFormat: data.parent_matricule_format || DEFAULT_SETTINGS.parentMatriculeFormat,
          teacherMatriculeFormat: data.teacher_matricule_format || DEFAULT_SETTINGS.teacherMatriculeFormat,
          defaultStudentPassword: data.default_student_password || DEFAULT_SETTINGS.defaultStudentPassword,
          defaultParentPassword: data.default_parent_password || DEFAULT_SETTINGS.defaultParentPassword,
          defaultTeacherPassword: data.default_teacher_password || DEFAULT_SETTINGS.defaultTeacherPassword,
          autoGenerateStudentMatricule: data.auto_generate_student_matricule ?? DEFAULT_SETTINGS.autoGenerateStudentMatricule,
          autoGenerateParentMatricule: data.auto_generate_parent_matricule ?? DEFAULT_SETTINGS.autoGenerateParentMatricule,
          autoGenerateTeacherMatricule: data.auto_generate_teacher_matricule ?? DEFAULT_SETTINGS.autoGenerateTeacherMatricule,
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

      setSettings(prev => ({ ...prev, ...newSettings }));
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres:', error);
      return false;
    }
  };

  return { settings, loading, updateSettings };
};
