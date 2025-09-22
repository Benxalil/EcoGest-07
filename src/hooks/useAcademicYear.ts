import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAcademicYear() {
  const [academicYear, setAcademicYear] = useState<string>('2024/2025');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAcademicYear = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (profile?.school_id) {
        const { data: school } = await supabase
          .from('schools')
          .select('academic_year')
          .eq('id', profile.school_id)
          .single();

        if (school?.academic_year) {
          setAcademicYear(school.academic_year);
        }
      }
    } catch (error) {
      console.error('Error fetching academic year:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAcademicYear = async (newYear: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }

      // Vérifier si l'utilisateur a un profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .maybeSingle();

      let schoolId = profile?.school_id;

      // Si l'utilisateur n'a pas de profil, créer un profil et une école par défaut
      if (!profile) {
        // Créer d'abord une école par défaut
        const { data: newSchool, error: schoolError } = await supabase
          .from('schools')
          .insert({
            name: 'École par défaut',
            academic_year: newYear
          })
          .select()
          .single();

        if (schoolError) {
          console.error('Erreur lors de la création de l\'école:', schoolError);
          throw new Error('Impossible de créer l\'école par défaut');
        }

        schoolId = newSchool.id;

        // Créer le profil utilisateur
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            first_name: user.user_metadata?.first_name || 'Utilisateur',
            last_name: user.user_metadata?.last_name || '',
            email: user.email || '',
            role: 'school_admin',
            school_id: schoolId
          });

        if (profileError) {
          console.error('Erreur lors de la création du profil:', profileError);
          throw new Error('Impossible de créer le profil utilisateur');
        }

        toast({
          title: "Configuration initiale",
          description: "Votre profil et école ont été configurés automatiquement",
        });
      }

      // Si pas d'école associée, créer une école par défaut
      if (!schoolId) {
        const { data: newSchool, error: schoolError } = await supabase
          .from('schools')
          .insert({
            name: 'École par défaut',
            academic_year: newYear
          })
          .select()
          .single();

        if (schoolError) throw schoolError;

        schoolId = newSchool.id;

        // Mettre à jour le profil avec l'ID de l'école
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ school_id: schoolId })
          .eq('id', user.id);

        if (updateProfileError) throw updateProfileError;
      }

      // Maintenant mettre à jour l'année académique
      const { error } = await supabase
        .from('schools')
        .update({ academic_year: newYear })
        .eq('id', schoolId);

      if (error) throw error;

      setAcademicYear(newYear);
      
      // Dispatch event pour notifier les autres composants
      window.dispatchEvent(new CustomEvent('academicYearUpdated', { 
        detail: { academicYear: newYear } 
      }));
      
      return true;
    } catch (error) {
      console.error('Error updating academic year:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour l'année académique",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchAcademicYear();

    // Écouter les mises à jour de l'année académique
    const handleAcademicYearUpdate = (event: CustomEvent) => {
      setAcademicYear(event.detail.academicYear);
    };

    window.addEventListener('academicYearUpdated', handleAcademicYearUpdate as EventListener);
    
    return () => {
      window.removeEventListener('academicYearUpdated', handleAcademicYearUpdate as EventListener);
    };
  }, []);

  return {
    academicYear,
    loading,
    updateAcademicYear,
    refetch: fetchAcademicYear
  };
}