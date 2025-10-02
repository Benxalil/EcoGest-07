import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { httpCache } from '@/utils/httpCache';

export interface SubscriptionStatus {
  isTrialActive: boolean;
  trialStartDate: Date | null;
  trialEndDate: Date | null;
  daysRemaining: number;
  showWarning: boolean;
  isExpired: boolean;
}

export const useSubscription = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isTrialActive: false,
    trialStartDate: null,
    trialEndDate: null,
    daysRemaining: 0,
    showWarning: false,
    isExpired: false,
  });

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  // Fonction pour simuler différents états d'abonnement (développement seulement)
  const simulateSubscriptionState = (state: 'active' | 'warning' | 'expired' | 'reset') => {
    // Simulation removed - using database only
    checkSubscriptionStatus();
    
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const checkSubscriptionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Cache profile lookup
      const profile = await httpCache.get(
        `profile:${user.id}:school_id`,
        async () => {
          const { data } = await supabase
            .from('profiles')
            .select('school_id')
            .eq('id', user.id)
            .single();
          return data;
        },
        { ttl: 2 * 60 * 1000, strategy: 'stale-while-revalidate' }
      );

      if (!profile?.school_id) return;

      // Cache school subscription data
      const school = await httpCache.get(
        `school:${profile.school_id}:subscription`,
        async () => {
          const { data } = await supabase
            .from('schools')
            .select('trial_end_date, subscription_status, starter_compatible')
            .eq('id', profile.school_id)
            .single();
          return data;
        },
        { ttl: 2 * 60 * 1000, strategy: 'stale-while-revalidate' }
      );

      if (!school) return;

      const trialEndDate = new Date(school.trial_end_date);
      const now = new Date();
      const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (school.subscription_status === 'active') {
        setSubscriptionStatus({
          isTrialActive: true,
          trialStartDate: null,
          trialEndDate,
          daysRemaining: Math.max(daysRemaining, 0),
          showWarning: false,
          isExpired: false,
        });
      } else if (school.subscription_status === 'cancelled' || school.subscription_status === 'suspended') {
        setSubscriptionStatus({
          isTrialActive: false,
          trialStartDate: null,
          trialEndDate,
          daysRemaining: 0,
          showWarning: false,
          isExpired: true,
        });
      } else {
        // Trial status
        const isTrialActive = daysRemaining > 0;
        const showWarning = daysRemaining <= 5 && daysRemaining > 0;
        const isExpired = daysRemaining <= 0;

        setSubscriptionStatus({
          isTrialActive,
          trialStartDate: null,
          trialEndDate,
          daysRemaining: Math.max(0, daysRemaining),
          showWarning,
          isExpired,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut d\'abonnement:', error);
    }
  };

  const resetTrial = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (profile?.school_id) {
      const newTrialEndDate = new Date();
      newTrialEndDate.setDate(newTrialEndDate.getDate() + 30);
      
      await supabase
        .from('schools')
        .update({ 
          trial_end_date: newTrialEndDate.toISOString(),
          subscription_status: 'trial'
        })
        .eq('id', profile.school_id);
      
      // Invalidate caches
      httpCache.invalidateByPrefix(`school:${profile.school_id}`);
    }
    
    checkSubscriptionStatus();
  };

  return {
    subscriptionStatus,
    refreshStatus: checkSubscriptionStatus,
    resetTrial,
    simulateSubscriptionState,
  };
};