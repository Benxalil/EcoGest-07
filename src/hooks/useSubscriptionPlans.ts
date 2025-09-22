import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  price: number; // en centimes XOF
  currency: string;
  period: 'monthly' | 'annual';
  max_students: number | null;
  max_classes: number | null;
  features: any;
  is_active: boolean;
}

export const useSubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (fetchError) throw fetchError;

      setPlans((data || []).map(plan => ({
        ...plan,
        period: plan.period as 'monthly' | 'annual'
      })));
    } catch (err) {
      console.error('Erreur lors de la récupération des plans:', err);
      setError('Impossible de récupérer les plans d\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const getPlanByCode = (code: string) => {
    return plans.find(plan => plan.code === code);
  };

  const formatPrice = (price: number, currency: string = 'XOF') => {
    // Convertir les centimes en unité principale (diviser par 100)
    const amount = price / 100;
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return {
    plans,
    loading,
    error,
    refetch: fetchPlans,
    getPlanByCode,
    formatPrice
  };
};