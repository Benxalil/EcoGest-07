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
    hasPaymentManagement: false, // Starter n'a pas la gestion des paiements
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
    hasPaymentManagement: false, // Starter n'a pas la gestion des paiements
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
    maxStudents: 500, // Corriger selon la base de données
    maxClasses: 15, // Corriger selon la base de données
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
    maxStudents: 500, // Corriger selon la base de données
    maxClasses: 15, // Corriger selon la base de données
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
  const [starterCompatible, setStarterCompatible] = useState(true);
  const [proCompatible, setProCompatible] = useState(true);
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
        .select('subscription_status, subscription_plan, starter_compatible, pro_compatible')
        .eq('id', userProfile.schoolId)
        .single();

      if (error) throw error;

      if (school?.subscription_plan && PLAN_FEATURES[school.subscription_plan as SubscriptionPlan]) {
        setCurrentPlan(school.subscription_plan as SubscriptionPlan);
      } else if (school?.subscription_status === 'trial') {
        setCurrentPlan('trial'); } else {
        setCurrentPlan('trial'); // Par défaut
      }
      
      setStarterCompatible(school?.starter_compatible ?? true);
      setProCompatible(school?.pro_compatible ?? true);
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

  const markAsNotStarterCompatible = async () => {
    if (!userProfile?.schoolId) return;
    
    try {
      await supabase
        .from('schools')
        .update({ starter_compatible: false })
        .eq('id', userProfile.schoolId);
      
      setStarterCompatible(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la compatibilité Starter:', error);
    }
  };

  const markAsNotProCompatible = async () => {
    if (!userProfile?.schoolId) return;
    
    try {
      await supabase
        .from('schools')
        .update({ pro_compatible: false })
        .eq('id', userProfile.schoolId);
      
      setProCompatible(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la compatibilité Pro:', error);
    }
  };

  const checkStarterLimits = (feature: 'students' | 'classes', currentCount: number) => {
    const starterFeatures = PLAN_FEATURES['starter_monthly'];
    const limit = feature === 'students' ? starterFeatures.maxStudents : starterFeatures.maxClasses;
    
    return {
      exceedsStarter: currentCount >= (limit || 0),
      starterLimit: limit,
      isTrialActive: currentPlan === 'trial'
    };
  };

  const checkProLimits = (feature: 'students' | 'classes', currentCount: number) => {
    const proFeatures = PLAN_FEATURES['pro_monthly'];
    const limit = feature === 'students' ? proFeatures.maxStudents : proFeatures.maxClasses;
    
    return {
      exceedsPro: currentCount >= (limit || 0),
      proLimit: limit,
      isTrialActive: currentPlan === 'trial'
    };
  };

  // Fonction générique pour vérifier tous les paliers
  const checkPlanLimits = (feature: 'students' | 'classes', currentCount: number) => {
    const starterCheck = checkStarterLimits(feature, currentCount);
    const proCheck = checkProLimits(feature, currentCount);
    
    return {
      starter: starterCheck,
      pro: proCheck,
      // Déterminer quel palier est dépassé
      exceededPlan: starterCheck.exceedsStarter && !proCheck.exceedsPro ? 'starter' :
                    proCheck.exceedsPro ? 'pro' : null
    };
  };

  /**
   * Récupère l'abonnement actif depuis la table subscriptions
   */
  const getActiveSubscription = async () => {
    if (!userProfile.schoolId) return null;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('school_id', userProfile.schoolId)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      const endDate = new Date(data.end_date);
      const now = new Date();
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        subscription: data,
        plan: data.subscription_plans,
        startDate: new Date(data.start_date),
        endDate,
        daysRemaining: Math.max(0, daysRemaining)
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'abonnement actif:', error);
      return null;
    }
  };

  return {
    currentPlan,
    loading,
    starterCompatible,
    proCompatible,
    features: getCurrentFeatures(),
    planDetails: getCurrentPlanDetails(),
    hasFeature,
    isFeatureLimited,
    getFeatureLimit,
    markAsNotStarterCompatible,
    markAsNotProCompatible,
    checkStarterLimits,
    checkProLimits,
    checkPlanLimits,
    refreshPlan: fetchSubscriptionPlan,
    getActiveSubscription
  };
};