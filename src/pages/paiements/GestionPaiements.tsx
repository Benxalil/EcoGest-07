import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAcademicYear } from "@/hooks/useAcademicYear";
import { getAcademicMonths } from "@/utils/academicCalendar";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { usePayments } from "@/hooks/usePayments";
import { Button } from "@/components/ui/button";
import { Lock, Crown } from "lucide-react";

// Fonction pour calculer les statistiques de paiement par classe
const getClassesWithPaymentStats = (classes: any[], students: any[], payments: any[], currentMonth: string) => {
  return classes.map((classe: any) => {
    const nomCompletClasse = `${classe.name} ${classe.level}${classe.section ? ` - ${classe.section}` : ''}`;
    // Filtrer les élèves de cette classe
    const elevesClasse = students.filter((student: any) => student.class_id === classe.id);
    
    // Compter les élèves payés pour ce mois
    const elevesPayes = elevesClasse.filter((student: any) => {
      return payments.some((payment: any) => 
        payment.student_id === student.id && 
        payment.payment_month === currentMonth
      );
    }).length;
    
    const totalEleves = elevesClasse.length;
    
    return {
      id: classe.id,
      nom: nomCompletClasse,
      elevesPayes,
      totalEleves,
      eleves: elevesClasse
    };
  });
};


export default function GestionPaiements() {
  const navigate = useNavigate();
  const { academicYear } = useAcademicYear();
  const { hasFeature, currentPlan } = useSubscriptionPlan();
  const { classes, loading: classesLoading } = useClasses();
  const { students, loading: studentsLoading } = useStudents();
  const { payments, loading: paymentsLoading } = usePayments();

  // Temporairement désactiver la vérification du plan pour permettre l'accès
  // TODO: Réactiver quand le système d'abonnement sera configuré
  // if (!hasFeature('hasPaymentManagement')) {
  //   return (
  //     <Layout>
  //       <div className="container mx-auto py-8">
  //         <div className="max-w-2xl mx-auto text-center">
  //           <Card className="border-amber-200 bg-amber-50">
  //             <CardContent className="pt-6">
  //               <div className="flex flex-col items-center space-y-4">
  //                 <div className="p-3 bg-amber-100 rounded-full">
  //                   <Lock className="h-8 w-8 text-amber-600" />
  //                 </div>
  //                 <h2 className="text-2xl font-semibold text-gray-900">
  //                   Fonctionnalité Non Disponible
  //                 </h2>
  //                 <p className="text-gray-600 text-center max-w-md">
  //                   La gestion des paiements n'est pas incluse dans votre plan {currentPlan.replace('_', ' ').toUpperCase()}.
  //                 </p>
  //                 <p className="text-sm text-gray-500">
  //                   Passez au plan <strong>Pro</strong> ou <strong>Premium</strong> pour accéder à cette fonctionnalité.
  //                 </p>
  //                 <div className="flex gap-3 mt-6">
  //                   <Button 
  //                     onClick={() => navigate('/abonnement')}
  //                     className="bg-blue-600 hover:bg-blue-700 text-white"
  //                   >
  //                     <Crown className="h-4 w-4 mr-2" />
  //                     Voir les Plans
  //                   </Button>
  //                   <Button 
  //                     variant="outline" 
  //                     onClick={() => navigate('/dashboard')}
  //                   >
  //                     Retour au Tableau de Bord
  //                   </Button>
  //                 </div>
  //               </div>
  //             </CardContent>
  //           </Card>
  //         </div>
  //       </Layout>
  //     );
  // }

  // Utiliser useMemo pour les mois académiques
  const academicMonths = useMemo(() => {
    return getAcademicMonths(academicYear);
  }, [academicYear]);

  // Utiliser useMemo pour éviter les recalculs inutiles
  const classesWithStats = useMemo(() => {
    if (classes.length > 0 && students.length > 0) {
      // Calculer les statistiques pour chaque mois
      const statsByMonth: { [key: string]: any[] } = {};
      
      academicMonths.forEach(month => {
        statsByMonth[month.name] = getClassesWithPaymentStats(classes, students, payments, month.name);
      });
      
      return statsByMonth;
    }
    return {};
  }, [classes, students, payments, academicMonths]);

  // Ajouter un état de chargement
  if (classesLoading || studentsLoading || paymentsLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des données de paiement...</p>
              <p className="text-sm text-gray-500 mt-2">
                Classes: {classesLoading ? 'Chargement...' : `${classes.length} trouvées`} | 
                Élèves: {studentsLoading ? 'Chargement...' : `${students.length} trouvés`}
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Statistiques globales (en excluant les mois désactivés)
  const totalClasses = classes.length;
  const totalEleves = students.length;
  
  const handleClasseClick = (classeId: string, mois: string) => {
    navigate(`/paiements/classe/${classeId}?mois=${mois}`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Paiements</h1>
            <p className="text-gray-600 mt-1">Suivi des paiements des mensualités scolaires</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total des Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClasses}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total des Élèves</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEleves}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Année Scolaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{academicYear}</div>
            </CardContent>
          </Card>
        </div>

        {/* Paiements par mois */}
        <Card>
          <CardHeader>
            <CardTitle>Paiements par Mois - {academicYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {academicMonths.map((mois, index) => {
                return (
                  <AccordionItem 
                    key={`${mois.name}-${mois.year}`} 
                    value={`mois-${index}`}
                  >
                    <AccordionTrigger className="text-left">
                      <div className="flex justify-between items-center w-full mr-4">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">
                            {mois.name} {mois.year}
                          </span>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {classesWithStats[mois.name]?.length || 0} classes
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 mt-4">
                        {(classesWithStats[mois.name] || []).map((classe) => (
                          <div
                            key={classe.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleClasseClick(classe.id, mois.name)}
                          >
                            <div className="flex items-center space-x-4">
                              <div>
                                <h4 className="font-medium">{classe.nom}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {classe.elevesPayes}/{classe.totalEleves} élèves payés
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="flex space-x-2">
                                <Badge 
                                  variant="secondary" 
                                  className="bg-green-100 text-green-800"
                                >
                                  {classe.elevesPayes} payés
                                </Badge>
                                <Badge 
                                  variant="secondary" 
                                  className="bg-red-100 text-red-800"
                                >
                                  {classe.totalEleves - classe.elevesPayes} non payés
                                </Badge>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}