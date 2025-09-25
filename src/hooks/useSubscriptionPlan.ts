import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export type SubscriptionPlan = 
  | 'starter_monthly' 
  | 'starter_annual' 
  | 'pro_monthly' 
  | 'pro_annual' 
  | 'premium_monthly' 
  | 'premium_annual' 
  | 'trial';

export interface PlanFeatures {
  maxStudents: number | null; // null = illimité
  maxClasses: number | null; // null = illimité
  hasPaymentManagement: boolean;
  hasPremiumSupport: boolean;
  hasDedicatedAssistance: boolean;
  supportDays: number; // 6 ou 7 jours par semaine
  hasTraining: boolean;
  hasNotesAndReports: boolean;
  hasAttendance: boolean;
  hasSchedule: boolean;
  hasLessonLog: boolean;
}

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  trial: {
    maxStudents: null,
    maxClasses: null,
    hasPaymentManagement: true,
    hasPremiumSupport: false,
    hasDedicatedAssistance: false,
    supportDays: 7,
    hasTraining: true,
    hasNotesAndReports: true,
    hasAttendance: true,
    hasSchedule: true,
    hasLessonLog: true,
  },
  starter_monthly: {
    maxStudents: 200,
    maxClasses: 6,
    hasPaymentManagement: true,
    hasPremiumSupport: false,
    hasDedicatedAssistance: false,
    supportDays: 6,
    hasTraining: true,
    hasNotesAndReports: true,
    hasAttendance: true,
    hasSchedule: true,
    hasLessonLog: true,
  },
  starter_annual: {
    maxStudents: 200,
    maxClasses: 6,
    hasPaymentManagement: true,
    hasPremiumSupport: false,
    hasDedicatedAssistance: false,
    supportDays: 6,
    hasTraining: true,
    hasNotesAndReports: true,
    hasAttendance: true,
    hasSchedule: true,
    hasLessonLog: true,
  },
  pro_monthly: {
    maxStudents: 800,
    maxClasses: null,
    hasPaymentManagement: true,
    hasPremiumSupport: false,
    hasDedicatedAssistance: false,
    supportDays: 7,
    hasTraining: true,
    hasNotesAndReports: true,
    hasAttendance: true,
    hasSchedule: true,
    hasLessonLog: true,
  },
  pro_annual: {
    maxStudents: 800,
    maxClasses: null,
    hasPaymentManagement: true,
    hasPremiumSupport: false,
    hasDedicatedAssistance: false,
    supportDays: 7,
    hasTraining: true,
    hasNotesAndReports: true,
    hasAttendance: true,
    hasSchedule: true,
    hasLessonLog: true,
  },
  premium_monthly: {
    maxStudents: null,
    maxClasses: null,
    hasPaymentManagement: true,
    hasPremiumSupport: true,
    hasDedicatedAssistance: true,
    supportDays: 7,
    hasTraining: true,
    hasNotesAndReports: true,
    hasAttendance: true,
    hasSchedule: true,
    hasLessonLog: true,
  },
  premium_annual: {
    maxStudents: null,
    maxClasses: null,
    hasPaymentManagement: true,
    hasPremiumSupport: true,
    hasDedicatedAssistance: true,
    supportDays: 7,
    hasTraining: true,
    hasNotesAndReports: true,
    hasAttendance: true,
    hasSchedule: true,
    hasLessonLog: true,
  },
};

export const PLAN_DETAILS = {
  starter_monthly: {
    name: 'Starter',
    price: 25000,
    currency: 'FCFA',
    period: 'mois',
    popular: false,
  },
  starter_annual: {
    name: 'Starter',
    price: 202000,
    currency: 'FCFA',
    period: 'an',
    popular: false,
    monthlyEquivalent: 25000 * 12,
    savings: Math.round(((25000 * 12 - 202000) / (25000 * 12)) * 100),
  },
  pro_monthly: {
    name: 'Pro',
    price: 40000,
    currency: 'FCFA',
    period: 'mois',
    popular: true,
  },
  pro_annual: {
    name: 'Pro',
    price: 359000,
    currency: 'FCFA',
    period: 'an',
    popular: true,
    monthlyEquivalent: 40000 * 12,
    savings: Math.round(((40000 * 12 - 359000) / (40000 * 12)) * 100),
  },
  premium_monthly: {
    name: 'Premium',
    price: 60000,
    currency: 'FCFA',
    period: 'mois',
    popular: false,
  },
  premium_annual: {
    name: 'Premium',
    price: 486000,
    currency: 'FCFA',
    period: 'an',
    popular: false,
    monthlyEquivalent: 60000 * 12,
    savings: Math.round(((60000 * 12 - 486000) / (60000 * 12)) * 100),
  },
  trial: {
    name: 'Essai gratuit',
    price: 0,
    currency: 'FCFA',
    period: '30 jours',
    popular: false,
  },
};

export const useSubscriptionPlan = () => {
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('trial');
  const [loading, setLoading] = useState(true);
  const { userProfile } = useUserRole();

  const fetchSubscriptionPlan = async () => {
    if (!userProfile?.schoolId) {
      setCurrentPlan('trial');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: school, error } = await supabase
        .from('schools')
        .select('subscription_status, subscription_plan')
        .eq('id', userProfile.schoolId)
        .single();

      if (error) throw error;

      if ((school as any)?.subscription_plan && PLAN_FEATURES[(school as any).subscription_plan as SubscriptionPlan]) {
        setCurrentPlan((school as any).subscription_plan as SubscriptionPlan);
      } else if ((school as any)?.subscription_status === 'trial') {
        setCurrentPlan('trial');
      } else {
        setCurrentPlan('trial'); // Par défaut
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du plan d\'abonnement:', error);
      setCurrentPlan('trial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionPlan();
  }, [userProfile?.schoolId]);

  const getCurrentFeatures = (): PlanFeatures => {
    return PLAN_FEATURES[currentPlan];
  };

  const getCurrentPlanDetails = () => {
    return PLAN_DETAILS[currentPlan];
  };

  const hasFeature = (feature: keyof PlanFeatures): boolean => {
    const features = getCurrentFeatures();
    return Boolean(features[feature]);
  };

  const isFeatureLimited = (feature: 'students' | 'classes', currentCount: number): boolean => {
    const features = getCurrentFeatures();
    
    if (feature === 'students' && features.maxStudents !== null) {
      return currentCount >= features.maxStudents;
    }
    
    if (feature === 'classes' && features.maxClasses !== null) {
      return currentCount >= features.maxClasses;
    }
    
    return false;
  };

  const getFeatureLimit = (feature: 'students' | 'classes'): number | null => {
    const features = getCurrentFeatures();
    
    if (feature === 'students') {
      return features.maxStudents;
    }
    
    if (feature === 'classes') {
      return features.maxClasses;
    }
    
    return null;
  };

  return {
    currentPlan,
    loading,
    features: getCurrentFeatures(),
    planDetails: getCurrentPlanDetails(),
    hasFeature,
    isFeatureLimited,
    getFeatureLimit,
    refreshPlan: fetchSubscriptionPlan,
  };
};