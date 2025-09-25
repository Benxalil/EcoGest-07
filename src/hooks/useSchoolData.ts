import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useUserRole } from './useUserRole';

type SchoolRow = Database['public']['Tables']['schools']['Row'];
type SchoolUpdate = Database['public']['Tables']['schools']['Update'];

export interface SchoolData {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  academic_year: string;
  school_type?: Database['public']['Enums']['school_type'] | null;
  currency?: Database['public']['Enums']['currency_type'] | null;
  creation_year?: number | null;
  timezone?: string | null;
  language?: Database['public']['Enums']['language_type'] | null;
  semester_type?: Database['public']['Enums']['semester_system_type'] | null;
  sponsor_name?: string | null;
  sponsor_phone?: string | null;
  sponsor_email?: string | null;
  school_suffix?: string | null;
  subscription_status?: Database['public']['Enums']['subscription_status'] | null;
  trial_end_date?: string | null;
  system?: string; // Added for compatibility
}

export const useSchoolData = () => {
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();

  const fetchSchoolData = async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', userProfile.schoolId)
        .single();

      if (error) throw error;
      
      setSchoolData(data);
    } catch (err) {
      console.error('Erreur lors de la récupération des données d\'école:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const updateSchoolData = async (updates: SchoolUpdate) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('schools')
        .update(updates)
        .eq('id', userProfile.schoolId);

      if (error) throw error;
      
      // Refresh data after update
      await fetchSchoolData();
      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour des données d\'école:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return false;
    }
  };

  useEffect(() => {
    fetchSchoolData();
  }, [userProfile?.schoolId]);

  // Provide default values if no school data is available
  const getDefaultSchoolData = (): SchoolData => ({
    id: '',
    name: 'École Connectée',
    address: 'Adresse de l\'école',
    phone: 'Numéro de téléphone',
    academic_year: '2024/2025',
    school_type: 'public',
    currency: 'FCFA',
    creation_year: 2024,
    timezone: 'Africa/Dakar',
    language: 'french',
    semester_type: 'semester',
    subscription_status: 'trial'
  });

  return {
    schoolData: schoolData || getDefaultSchoolData(),
    loading,
    error,
    updateSchoolData,
    refreshSchoolData: fetchSchoolData
  };
};