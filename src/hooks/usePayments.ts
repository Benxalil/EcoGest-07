import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';

export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  payment_method: string;
  payment_type: string;
  payment_month?: string;
  paid_by: string;
  phone_number?: string;
  payment_date: string;
  school_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentData {
  student_id: string;
  amount: number;
  payment_method: string;
  payment_type: string;
  payment_month?: string;
  paid_by: string;
  phone_number?: string;
  payment_date: string;
}

export const usePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  const fetchPayments = async (
    page: number = 1,
    pageSize: number = 100
  ) => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const startIndex = (page - 1) * pageSize;

      const { data: paymentsData, error, count } = await supabase
        .from('payments')
        .select('id, student_id, amount, payment_method, payment_type, payment_month, paid_by, phone_number, payment_date, school_id, created_at, updated_at', { count: 'exact' })
        .eq('school_id', userProfile.schoolId)
        .range(startIndex, startIndex + pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Utiliser les données directement telles qu'elles arrivent de Supabase
      setPayments(paymentsData || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Erreur lors de la récupération des paiements:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setPayments([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (paymentData: CreatePaymentData) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          student_id: paymentData.student_id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          payment_type: paymentData.payment_type,
          payment_month: paymentData.payment_month,
          paid_by: paymentData.paid_by,
          phone_number: paymentData.phone_number,
          payment_date: paymentData.payment_date,
          school_id: userProfile.schoolId
        })
        .select()
        .single();

      if (error) throw error;
      
      // Utiliser les données directement
      setPayments(prev => [data, ...prev]);

      toast({
        title: "Paiement enregistré",
        description: "Le paiement a été enregistré avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la création du paiement:', err);
      toast({
        title: "Erreur lors de l'enregistrement",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de l'enregistrement.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updatePayment = async (id: string, paymentData: Partial<CreatePaymentData>) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { data, error } = await supabase
        .from('payments')
        .update(paymentData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId)
        .select()
        .single();

      if (error) throw error;
      
      // Utiliser les données directement
      setPayments(prev => prev.map(payment => 
        payment.id === id ? data : payment
      ));

      toast({
        title: "Paiement mis à jour",
        description: "Le paiement a été mis à jour avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du paiement:', err);
      toast({
        title: "Erreur lors de la mise à jour",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deletePayment = async (id: string) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      setPayments(prev => prev.filter(payment => payment.id !== id));

      toast({
        title: "Paiement supprimé",
        description: "Le paiement a été supprimé avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression du paiement:', err);
      toast({
        title: "Erreur lors de la suppression",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [userProfile?.schoolId]);

  const hasStudentPaid = (studentId: string, paymentType: string, month?: string): boolean => {
    return payments.some(payment => 
      payment.student_id === studentId && 
      payment.payment_type === paymentType && 
      (!month || payment.payment_month === month)
    );
  };

  const getStudentPayment = (studentId: string, paymentType: string, month?: string) => {
    return payments.find(payment => 
      payment.student_id === studentId && 
      payment.payment_type === paymentType && 
      (!month || payment.payment_month === month)
    );
  };

  return {
    payments,
    totalCount,
    loading,
    error,
    createPayment,
    updatePayment,
    deletePayment,
    refreshPayments: fetchPayments,
    fetchPayments,
    hasStudentPaid,
    getStudentPayment
  };
};