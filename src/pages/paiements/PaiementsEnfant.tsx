import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { Check, Clock, X, Lock, Crown } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";

type Payment = Database['public']['Tables']['payments']['Row'];
type PaymentCategory = Database['public']['Tables']['payment_categories']['Row'];
type Student = Database['public']['Tables']['students']['Row'];

interface PaymentWithCategory extends Payment {
  category: PaymentCategory;
}

export default function PaiementsEnfant() {
  const { userProfile } = useUserRole();
  const { hasFeature, currentPlan } = useSubscriptionPlan();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentWithCategory[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildPayments = async () => {
      if (!userProfile?.email) return;

      try {
        // Trouver l'enfant lié au parent
        const { data: childData, error: childError } = await supabase
          .from('students')
          .select('*')
          .eq('parent_email', userProfile.email)
          .single();

        if (childError) {
          console.error('Erreur lors de la récupération de l\'enfant:', childError);
          return;
        }

        setStudent(childData);

        // Récupérer les paiements de l'enfant
        const { data: paymentsData, error } = await supabase
          .from('payments')
          .select(`
            *,
            category:payment_categories(*)
          `)
          .eq('student_id', childData.id)
          .order('due_date', { ascending: true });

        if (error) {
          console.error('Erreur lors de la récupération des paiements:', error); } else {
          setPayments(paymentsData || []);
        }
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChildPayments();
  }, [userProfile]);

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

  const getPaymentStatusIcon = (payment: Payment) => {
    const now = new Date();
    const dueDate = new Date(payment.due_date);
    
    if (payment.status === 'paid') {
      return <Check className="h-4 w-4 text-green-600" />;
    } else if (dueDate < now) {
      return <X className="h-4 w-4 text-red-600" />; } else {
      return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getPaymentStatusBadge = (payment: Payment) => {
    const now = new Date();
    const dueDate = new Date(payment.due_date);
    
    if (payment.status === 'paid') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Payé</Badge>;
    } else if (dueDate < now) {
      return <Badge variant="destructive">En retard</Badge>; } else {
      return <Badge variant="secondary">En attente</Badge>;
    }
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!student) {
    return (
      <Layout>
        <div className="p-6">
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

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Paiements - {student.first_name} {student.last_name}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {payments.map((payment) => {
            const dueMonth = new Date(payment.due_date).getMonth();
            const monthName = monthNames[dueMonth];
            
            return (
              <Card key={payment.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getPaymentStatusIcon(payment)}
                      {monthName}
                    </CardTitle>
                    {getPaymentStatusBadge(payment)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Catégorie</p>
                    <p className="font-medium">{payment.category?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Montant</p>
                    <p className="font-bold text-lg">{payment.amount}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'échéance</p>
                    <p className="text-sm">{new Date(payment.due_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  {payment.paid_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Date de paiement</p>
                      <p className="text-sm text-green-600">{new Date(payment.paid_date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                  {payment.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm">{payment.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {payments.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                Aucun paiement enregistré pour votre enfant.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}