import { supabase } from '@/integrations/supabase/client';

/**
 * Calcule la date de fin d'un abonnement selon le type de plan
 * - Plan mensuel : +30 jours
 * - Plan annuel : date de fin de l'année académique ou +12 mois par défaut
 */
export const calculateSubscriptionEndDate = async (
  schoolId: string,
  planPeriod: 'monthly' | 'annual'
): Promise<Date> => {
  if (planPeriod === 'monthly') {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }

  // Plan annuel : utiliser l'année académique
  const { data: academicYear } = await supabase
    .from('academic_years')
    .select('end_date')
    .eq('school_id', schoolId)
    .eq('is_current', true)
    .single();

  if (academicYear?.end_date) {
    return new Date(academicYear.end_date);
  }

  // Fallback : 12 mois si pas d'année académique définie
  const fallbackDate = new Date();
  fallbackDate.setFullYear(fallbackDate.getFullYear() + 1);
  return fallbackDate;
};

/**
 * Version Deno pour les edge functions
 */
export const calculateSubscriptionEndDateDeno = async (
  supabaseClient: any,
  schoolId: string,
  planPeriod: 'monthly' | 'annual'
): Promise<Date> => {
  if (planPeriod === 'monthly') {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }

  // Plan annuel : utiliser l'année académique
  const { data: academicYear } = await supabaseClient
    .from('academic_years')
    .select('end_date')
    .eq('school_id', schoolId)
    .eq('is_current', true)
    .single();

  if (academicYear?.end_date) {
    return new Date(academicYear.end_date);
  }

  // Fallback : 12 mois si pas d'année académique définie
  const fallbackDate = new Date();
  fallbackDate.setFullYear(fallbackDate.getFullYear() + 1);
  return fallbackDate;
};
