import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { CreditCard, CheckCircle, Clock, XCircle, Lock, Crown } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { useOptimizedUserData } from "@/hooks/useOptimizedUserData";
import { useAcademicYear } from "@/hooks/useAcademicYear";
import { getAcademicMonths } from "@/utils/academicCalendar";
import { useAcademicYearDates } from "@/hooks/useAcademicYearDates";

type Payment = Database['public']['Tables']['payments']['Row'];

interface PaymentMonth {
  id: string;
  month: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paidDate?: string;
  dueDate: string;
  payment?: Payment;
}

export default function MesPaiements() {
  const { hasFeature, currentPlan } = useSubscriptionPlan();
  const navigate = useNavigate();
  const { profile } = useOptimizedUserData();
  const { academicYear } = useAcademicYear();
  const { dates: academicYearDates } = useAcademicYearDates();
  const [paymentMonths, setPaymentMonths] = useState<PaymentMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);

  // Récupérer les mois académiques avec fallback si pas de dates configurées
  const academicMonths = useMemo(() => {
    if (academicYearDates) {
      return getAcademicMonths(academicYearDates.startDate, academicYearDates.endDate);
    }
    
    // Fallback: générer l'année académique par défaut (Septembre → Juin)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Si on est avant septembre, l'année académique a commencé l'année dernière
    const startYear = currentMonth < 8 ? currentYear - 1 : currentYear;
    const endYear = startYear + 1;
    
    return getAcademicMonths(
      `${startYear}-09-01`, // 1er septembre
      `${endYear}-06-30`     // 30 juin
    );
  }, [academicYearDates]);

  // Récupérer l'ID de l'élève à partir du profil utilisateur
  useEffect(() => {
    const fetchStudentId = async () => {
      if (!profile?.id || !profile?.schoolId) return;

      try {
        const { data: studentData, error } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', profile.id)
          .eq('school_id', profile.schoolId)
          .maybeSingle();

        if (error) {
          console.error('Erreur lors de la récupération de l\'élève:', error);
          return;
        }

        if (studentData) {
          setStudentId(studentData.id);
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    fetchStudentId();
  }, [profile]);

  useEffect(() => {
    const fetchStudentPayments = async () => {
      if (!studentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Récupérer tous les paiements de l'élève
        const { data: paymentsData, error } = await supabase
          .from('payments')
          .select('*')
          .eq('student_id', studentId);

        if (error) {
          console.error('Erreur lors de la récupération des paiements:', error);
        }
        
        // Créer un map des paiements existants par mois
        const paymentsMap = new Map<string, Payment>();
        (paymentsData || []).forEach(payment => {
          if (payment.payment_month) {
            paymentsMap.set(payment.payment_month.toLowerCase(), payment);
          }
        });

        // Construire la liste complète avec statuts
        const now = new Date();
        const monthsWithStatus: PaymentMonth[] = academicMonths.map(month => {
          const payment = paymentsMap.get(month.name.toLowerCase());
          // Calculer la date d'échéance: dernier jour du mois
          const dueDate = new Date(month.year, month.monthIndex + 1, 0);
          
          let status: 'paid' | 'pending' | 'overdue' = 'pending';
          
          if (payment) {
            // Si un paiement existe, le statut est "paid"
            status = 'paid';
          } else if (now > dueDate) {
            // Si la date d'échéance est dépassée et pas de paiement, c'est "overdue"
            status = 'overdue';
          }

          return {
            id: payment?.id || `${month.name}-${month.year}-${studentId}`,
            month: `${month.name} ${month.year}`,
            amount: payment ? Number(payment.amount) : 0,
            status,
            paidDate: payment?.payment_date,
            dueDate: dueDate.toISOString(),
            payment
          };
        });

        setPaymentMonths(monthsWithStatus);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentPayments();

    // Écouter les changements en temps réel sur la table payments
    const channel = supabase
      .channel('student-payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `student_id=eq.${studentId}`
        },
        () => {
          // Recharger les paiements quand il y a un changement
          fetchStudentPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  // Vérifier si l'utilisateur a accès à la gestion des paiements
  if (!hasFeature('hasPaymentManagement')) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-3 bg-amber-100 rounded-full">
                    <Lock className="h-8 w-8 text-amber-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Fonctionnalité Non Disponible
                  </h2>
                  <p className="text-gray-600 text-center max-w-md">
                    L'accès aux paiements n'est pas inclus dans votre plan {currentPlan.replace('_', ' ').toUpperCase()}.
                  </p>
                  <p className="text-sm text-gray-500">
                    Passez au plan <strong>Pro</strong> ou <strong>Premium</strong> pour accéder à cette fonctionnalité.
                  </p>
                  <div className="flex gap-3 mt-6">
                    <Button 
                      onClick={() => navigate('/abonnement')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Voir les Plans
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/dashboard')}
                    >
                      Retour au Tableau de Bord
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  const getStatusIcon = (status: 'paid' | 'pending' | 'overdue') => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'overdue':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusBadge = (status: 'paid' | 'pending' | 'overdue') => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Payé</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">En attente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">En retard</Badge>;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const paidCount = paymentMonths.filter(p => p.status === 'paid').length;
  const overdueCount = paymentMonths.filter(p => p.status === 'overdue').length;

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-4">
          <CreditCard className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mes Paiements</h1>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{paidCount}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mois payés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">En retard</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des paiements par mois */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paymentMonths.map((paymentMonth) => (
            <Card 
              key={paymentMonth.id} 
              className={`hover:shadow-md transition-all ${
                paymentMonth.status === 'paid' ? 'border-l-4 border-green-500' :
                paymentMonth.status === 'overdue' ? 'border-l-4 border-red-500' :
                'border-l-4 border-yellow-500'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{paymentMonth.month}</CardTitle>
                  {getStatusIcon(paymentMonth.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentMonth.payment && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Montant:</span>
                      <span className="font-semibold">{formatAmount(paymentMonth.amount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Échéance:</span>
                    <span className="text-sm">{new Date(paymentMonth.dueDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                  
                  {paymentMonth.paidDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Payé le:</span>
                      <span className="text-sm text-green-600">{new Date(paymentMonth.paidDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  
                  {paymentMonth.payment?.payment_method && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Méthode:</span>
                      <span className="text-sm">{paymentMonth.payment.payment_method}</span>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    {getStatusBadge(paymentMonth.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Légende */}
        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            <CardTitle className="text-lg">Légende des statuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-600">Payé</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mois déjà payé par vos parents</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-600">En attente</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mois en cours ou pas encore arrivé</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-600">En retard</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mois dépassé et non payé</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}