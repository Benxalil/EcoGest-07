import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useParentChildren } from "@/hooks/useParentChildren";
import { ParentChildSelector } from "@/components/parent/ParentChildSelector";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { CreditCard, CheckCircle, Clock, XCircle, Lock, Crown } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { useAcademicYear } from "@/hooks/useAcademicYear";
import { getAcademicMonths } from "@/utils/academicCalendar";

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

export default function PaiementsEnfant() {
  const { hasFeature, currentPlan } = useSubscriptionPlan();
  const navigate = useNavigate();
  const { academicYear } = useAcademicYear();
  const [paymentMonths, setPaymentMonths] = useState<PaymentMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const { children, selectedChild, setSelectedChildId, loading: childrenLoading } = useParentChildren();

  // Récupérer les mois académiques depuis les paramètres système
  const academicMonths = useMemo(() => {
    return getAcademicMonths(academicYear);
  }, [academicYear]);

  useEffect(() => {
    const fetchChildPayments = async () => {
      if (!selectedChild?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Récupérer tous les paiements de l'enfant
        const { data: paymentsData, error } = await supabase
          .from('payments')
          .select('*')
          .eq('student_id', selectedChild.id);

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
            id: payment?.id || `${month.name}-${month.year}-${selectedChild.id}`,
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

    fetchChildPayments();

    // Écouter les changements en temps réel sur la table payments
    const channel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `student_id=eq.${selectedChild?.id}`
        },
        () => {
          // Recharger les paiements quand il y a un changement
          fetchChildPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChild?.id]);

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

  if (childrenLoading || loading) {
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

  if (children.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>Paiements de votre enfant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Aucun enfant associé à votre compte n'a été trouvé.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!selectedChild) {
    return null;
  }

  const paidCount = paymentMonths.filter(p => p.status === 'paid').length;
  const overdueCount = paymentMonths.filter(p => p.status === 'overdue').length;

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-4">
          <CreditCard className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Paiements - {selectedChild.first_name} {selectedChild.last_name}
          </h1>
        </div>

        {/* Sélecteur d'enfant si plusieurs enfants */}
        {children.length > 1 && (
          <ParentChildSelector 
            children={children}
            selectedChildId={selectedChild.id}
            onChildSelect={setSelectedChildId}
          />
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{paidCount}</p>
                  <p className="text-sm text-gray-500">Mois payés</p>
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
                  <p className="text-sm text-gray-500">En retard</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des paiements par mois */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paymentMonths.map((paymentMonth) => (
            <Card key={paymentMonth.id} className="hover:shadow-md transition-shadow">
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
                      <span className="text-sm text-gray-500">Montant:</span>
                      <span className="font-semibold">{formatAmount(paymentMonth.amount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Échéance:</span>
                    <span className="text-sm">{new Date(paymentMonth.dueDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                  
                  {paymentMonth.paidDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Payé le:</span>
                      <span className="text-sm text-green-600">{new Date(paymentMonth.paidDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  
                  {paymentMonth.payment?.payment_method && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Méthode:</span>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Légende des statuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-600">Payé</p>
                  <p className="text-sm text-gray-500">Mois déjà payé</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-600">En attente</p>
                  <p className="text-sm text-gray-500">Mois en cours ou pas encore arrivé</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-600">En retard</p>
                  <p className="text-sm text-gray-500">Mois dépassé et non payé</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}