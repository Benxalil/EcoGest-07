import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedUserRole } from './useOptimizedUserRole';
import { useCache } from './useCache';
import { useToast } from './use-toast';

// Interface basée sur le vrai schéma de la table payments
export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
  payment_method: string;
  paid_by: string;
  phone_number?: string;
  payment_month?: string;
  school_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentData {
  student_id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
  payment_method: string;
  paid_by: string;
  phone_number?: string;
  payment_month?: string;
}

export const useOptimizedPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { userProfile } = useOptimizedUserRole();
  const cache = useCache();
  const { toast } = useToast();

  const fetchPayments = useCallback(async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    const cacheKey = `payments_${userProfile.schoolId}`;
    const cachedPayments = cache.get<Payment[]>(cacheKey);
    
    if (cachedPayments) {
      console.log('Paiements récupérés depuis le cache');
      setPayments(cachedPayments);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mettre en cache pour 3 minutes
      cache.set(cacheKey, data || [], 3 * 60 * 1000);
      setPayments(data || []);
      console.log('Paiements récupérés depuis la DB et mis en cache');
      
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Erreur lors de la récupération des paiements');
      toast({
        title: "Erreur",
        description: "Impossible de charger les paiements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userProfile?.schoolId, cache, toast]);

  const createPayment = async (paymentData: CreatePaymentData): Promise<boolean> => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          ...paymentData,
          school_id: userProfile.schoolId
        });

      if (error) throw error;

      // Invalider le cache et recharger
      cache.delete(`payments_${userProfile.schoolId}`);
      await fetchPayments();
      
      toast({
        title: "Succès",
        description: "Paiement créé avec succès",
      });
      
      return true;
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création du paiement",
        variant: "destructive",
      });
      return false;
    }
  };

  const updatePayment = async (id: string, paymentData: Partial<CreatePaymentData>): Promise<boolean> => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('payments')
        .update(paymentData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      // Invalider le cache et recharger
      cache.delete(`payments_${userProfile.schoolId}`);
      await fetchPayments();
      
      toast({
        title: "Succès",
        description: "Paiement modifié avec succès",
      });
      
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification du paiement",
        variant: "destructive",
      });
      return false;
    }
  };

  const deletePayment = async (id: string): Promise<boolean> => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      // Invalider le cache et recharger
      cache.delete(`payments_${userProfile.schoolId}`);
      await fetchPayments();
      
      toast({
        title: "Succès",
        description: "Paiement supprimé avec succès",
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression du paiement",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    payments,
    loading,
    error,
    createPayment,
    updatePayment,
    deletePayment,
    refreshPayments: fetchPayments
  };
};