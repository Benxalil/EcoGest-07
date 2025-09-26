import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle, Clock, XCircle, Calendar, Lock, Crown } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { useNavigate } from "react-router-dom";
import { useStudents } from "@/hooks/useStudents";
import { usePayments } from "@/hooks/usePayments";

interface Payment {
  id: string;
  month: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paidDate?: string;
  dueDate: string;
}

export default function MesPaiements() {
  const { userProfile } = useUserRole();
  const { hasFeature, currentPlan } = useSubscriptionPlan();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentPayments();
  }, [userProfile]);

  const { students } = useStudents();
  const { payments: allPayments } = usePayments();

  const loadStudentPayments = async () => {
    try {
      setLoading(true);
      
      if (students.length > 0 && userProfile) {
        // Trouver l'élève correspondant à l'utilisateur connecté
        const student = students.find((s) => 
          s.parent_email === userProfile.email || 
          `${s.first_name} ${s.last_name}`.toLowerCase() === `${userProfile.firstName} ${userProfile.lastName}`.toLowerCase()
        );
        
        if (student) {
          // Filtrer les paiements pour cet élève
          const studentPayments = allPayments.filter((p) => p.student_id === student.id);
          
          // Générer les mois de l'année académique avec les statuts
          const academicMonths = generateAcademicMonths();
          const paymentsWithStatus = academicMonths.map((month, index) => {
            const existingPayment = studentPayments.find((p) => p.payment_month === month);
            const dueDate = new Date();
            dueDate.setMonth(8 + index); // Septembre = index 8
            dueDate.setDate(5); // 5 de chaque mois
            
            return {
              id: existingPayment?.id || `${student.id}-${index}`,
              month,
              amount: existingPayment?.amount || 50000, // Montant par défaut
              status: getPaymentStatus(existingPayment, dueDate),
              dueDate: dueDate.toISOString().split('T')[0]
            };
          });
          
          setPayments(paymentsWithStatus);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des paiements:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const generateAcademicMonths = (): string[] => {
    return [
      'Septembre', 'Octobre', 'Novembre', 'Décembre',
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin'
    ];
  };

  const getPaymentStatus = (payment: any, dueDate: Date): 'paid' | 'pending' | 'overdue' => {
    if (payment?.status === 'paid') return 'paid';
    
    const now = new Date();
    if (now > dueDate) return 'overdue';
    
    return 'pending';
  };

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const paidCount = payments.filter(p => p.status === 'paid').length;
  const overdueCount = payments.filter(p => p.status === 'overdue').length;
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-4">
          <CreditCard className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Mes Paiements</h1>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-lg font-bold text-blue-600">{formatAmount(paidAmount)}</p>
                  <p className="text-sm text-gray-500">Montant payé</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-lg font-bold text-purple-600">{formatAmount(totalAmount)}</p>
                  <p className="text-sm text-gray-500">Total année</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des paiements par mois */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {payments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{payment.month}</CardTitle>
                  {getStatusIcon(payment.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Montant:</span>
                    <span className="font-semibold">{formatAmount(payment.amount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Échéance:</span>
                    <span className="text-sm">{new Date(payment.dueDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                  
                  {payment.paidDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Payé le:</span>
                      <span className="text-sm text-green-600">{new Date(payment.paidDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    {getStatusBadge(payment.status)}
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
                  <p className="text-sm text-gray-500">Mois déjà payé par vos parents</p>
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