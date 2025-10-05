import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AcademicYearDates {
  startDate: string;
  endDate: string;
  name: string;
}

export function useAcademicYearDates() {
  const [dates, setDates] = useState<AcademicYearDates | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAcademicYearDates = async () => {
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
          // Récupérer l'année académique courante depuis la table academic_years
          const { data: academicYear } = await supabase
            .from('academic_years')
            .select('start_date, end_date, name')
            .eq('school_id', profile.school_id)
            .eq('is_current', true)
            .single();

          if (academicYear) {
            setDates({
              startDate: academicYear.start_date,
              endDate: academicYear.end_date,
              name: academicYear.name
            });
          }
        }
      } catch (error) {
        console.error('Error fetching academic year dates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAcademicYearDates();

    // Écouter les changements dans la table academic_years
    const channel = supabase
      .channel('academic-year-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'academic_years'
        },
        () => {
          fetchAcademicYearDates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { dates, loading };
}
