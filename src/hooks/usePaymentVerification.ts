import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour vérifier automatiquement le statut d'un paiement
 * Utile en cas de latence de retour d'API PayTech
 */
export const usePaymentVerification = (subscriptionId: string | null) => {
  useEffect(() => {
    if (!subscriptionId) return;

    let checkCount = 0;
    const maxChecks = 24; // 24 vérifications = 2 minutes à 5 secondes d'intervalle

    // Vérifier le statut toutes les 5 secondes pendant 2 minutes max
    const interval = setInterval(async () => {
      checkCount++;
      
      try {
        const { data } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('id', subscriptionId)
          .single();

        if (data?.status === 'active') {
          clearInterval(interval);
          window.location.href = '/?payment_success=true';
        }

        // Arrêter après 2 minutes
        if (checkCount >= maxChecks) {
          clearInterval(interval);
          console.log('Timeout de vérification de paiement atteint');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du paiement:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [subscriptionId]);
};
