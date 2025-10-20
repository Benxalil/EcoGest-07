import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Rocket, Zap, Trophy, Clock, Shield, Star } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { useState, useEffect } from "react";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Abonnement = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const { currentPlan, starterCompatible, proCompatible, getActiveSubscription } = useSubscriptionPlan();
  const { plans, loading: plansLoading, formatPrice } = useSubscriptionPlans();
  const { userProfile } = useUserRole();
  const { toast } = useToast();
  const { subscriptionStatus } = useSubscription();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState<string | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const navigate = useNavigate();

  // Charger l'abonnement actif au montage
  useEffect(() => {
    const loadActiveSubscription = async () => {
      const activeSub = await getActiveSubscription();
      setActiveSubscription(activeSub);
    };
    loadActiveSubscription();
  }, []);


  // Fonction pour déterminer si un plan est actif
  const isActivePlan = (planId: string) => {
    const planType = isAnnual ? 'annual' : 'monthly';
    return currentPlan === `${planId}_${planType}`;
  };

  // Fonction pour afficher les informations du plan
  const handleChoosePlan = (planId: string) => {
    toast({
      title: "Contactez-nous",
      description: "Pour souscrire à ce plan, veuillez contacter notre équipe commerciale.",
    });
  };

  if (plansLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement des plans...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Générer les plans à partir de la base de données
  const displayPlans = [
    {
      id: "starter",
      title: "STARTER", 
      icon: Rocket,
      dbPlans: {
        monthly: plans.find(p => p.code === 'starter_monthly'),
        annual: plans.find(p => p.code === 'starter_annual')
      },
      features: [
        { text: "Gestion de 200 élèves maximum", included: true },
        { text: "Gestion de 6 classes maximum", included: true },
        { text: "Gestion des notes & bulletins", included: true },
        { text: "Présence & Retard", included: true },
        { text: "Assistance 6j/7", included: true },
        { text: "Emplois du temps", included: true },
        { text: "Cahier de texte", included: true },
        { text: "Formation gratuite", included: true },
        { text: "Gestion des paiements", included: false },
        { text: "Support premium", included: false },
        { text: "Assistance dédiée", included: false }
      ]
    },
    {
      id: "pro",
      title: "PRO",
      icon: Zap,
      isPopular: true,
      dbPlans: {
        monthly: plans.find(p => p.code === 'pro_monthly'),
        annual: plans.find(p => p.code === 'pro_annual')
      },
      features: [
        { text: "Gestion de 500 élèves maximum", included: true },
        { text: "Gestion de 15 classes maximum", included: true },
        { text: "Gestion des notes & bulletins", included: true },
        { text: "Présence & Retard", included: true },
        { text: "Assistance 7j/7", included: true },
        { text: "Emplois du temps", included: true },
        { text: "Cahier de texte", included: true },
        { text: "Formation gratuite", included: true },
        { text: "Gestion des paiements", included: true },
        { text: "Support premium", included: false },
        { text: "Assistance dédiée", included: false }
      ]
    },
    {
      id: "premium",
      title: "PREMIUM",
      icon: Trophy,
      dbPlans: {
        monthly: plans.find(p => p.code === 'premium_monthly'),
        annual: plans.find(p => p.code === 'premium_annual')
      },
      features: [
        { text: "Gestion des élèves illimités", included: true },
        { text: "Gestion des classes illimitées", included: true },
        { text: "Gestion des notes & bulletins", included: true },
        { text: "Présence & Retard", included: true },
        { text: "Assistance 7j/7", included: true },
        { text: "Emplois du temps", included: true },
        { text: "Cahier de texte", included: true },
        { text: "Formation gratuite", included: true },
        { text: "Gestion des paiements", included: true },
        { text: "Support premium", included: true },
        { text: "Assistance dédiée", included: true }
      ]
    }
  ];

  // Fonction pour calculer l'économie annuelle
  const calculateSavings = (monthlyPrice: string, annualPrice: string) => {
    const monthly = parseFloat(monthlyPrice.replace(/\D/g, ''));
    const annual = parseFloat(annualPrice.replace(/\D/g, ''));
    const yearlyFromMonthly = monthly * 12;
    const savings = Math.round(((yearlyFromMonthly - annual) / yearlyFromMonthly) * 100);
    return savings;
  };

  return (
    <Layout>
      <div className="container mx-auto p-8 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choisissez votre plan d'abonnement
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Sélectionnez le plan qui convient le mieux à votre école et profitez de toutes nos fonctionnalités
          </p>

          {/* Affichage du statut actuel */}
          {activeSubscription ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8 max-w-4xl mx-auto">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="bg-green-100 rounded-full p-2">
                  <Star className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-900">
                  Abonnement actif
                </h3>
              </div>
              <div className="space-y-3">
                <p className="text-green-800 text-lg text-center">
                  <strong>Vous êtes actuellement abonné au plan {activeSubscription.plan?.name || 'Pro'}</strong>
                </p>
                <p className="text-green-700 text-center">
                  Votre abonnement expire le : <strong>{activeSubscription.endDate.toLocaleDateString('fr-FR')}</strong> ({activeSubscription.daysRemaining} jour{activeSubscription.daysRemaining > 1 ? 's' : ''} restant{activeSubscription.daysRemaining > 1 ? 's' : ''})
                </p>
              </div>
            </div>
          ) : subscriptionStatus.isTrialActive ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 max-w-4xl mx-auto">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="bg-blue-100 rounded-full p-2">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-blue-900">
                  Période d'essai gratuite active
                </h3>
              </div>
              <div className="space-y-3">
                <p className="text-blue-800 text-lg">
                  <strong>Vous êtes actuellement en période d'essai gratuite de 30 jours.</strong>
                </p>
                <p className="text-blue-700">
                  Il vous reste <strong>{subscriptionStatus.daysRemaining} jour{subscriptionStatus.daysRemaining > 1 ? 's' : ''}</strong> avec un accès complet à toutes les fonctionnalités comme un compte Pro.
                </p>
                {(!starterCompatible || !proCompatible) && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-orange-100 rounded-full p-1 mt-0.5">
                        <Shield className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-orange-900 mb-1">
                          Limitation{!starterCompatible && !proCompatible ? 's' : ''} des plans
                        </p>
                        {!starterCompatible && (
                          <p className="text-orange-800 mb-2">
                            • Plan <strong>Starter</strong> : Vous avez dépassé les limites (6 classes ou 200 élèves).
                          </p>
                        )}
                        {!proCompatible && (
                          <p className="text-orange-800 mb-2">
                            • Plan <strong>Pro</strong> : Vous avez dépassé les limites (15 classes ou 500 élèves).
                          </p>
                        )}
                        <p className="text-orange-800 mt-2">
                          À la fin de l'essai, vous devrez choisir un plan {!proCompatible ? 'Premium' : 'Pro ou Premium'}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
          
          {/* Toggle Switch */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative bg-gray-200 rounded-full p-1 w-48 h-12">
              <div 
                className={`absolute top-1 bottom-1 w-24 bg-black rounded-full transition-transform duration-300 ease-in-out ${
                  isAnnual ? 'transform translate-x-24' : 'transform translate-x-0'
                }`}
              />
              <div className="relative flex h-full">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`flex-1 rounded-full text-sm font-medium transition-colors duration-300 ${
                    !isAnnual ? 'text-white' : 'text-black'
                  }`}
                >
                  Mensuel
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`flex-1 rounded-full text-sm font-medium transition-colors duration-300 ${
                    isAnnual ? 'text-white' : 'text-black'
                  }`}
                >
                  Annuel
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          {displayPlans.map((plan) => {
            const IconComponent = plan.icon;
            const isActive = isActivePlan(plan.id);
            const currentPlan = isAnnual ? plan.dbPlans.annual : plan.dbPlans.monthly;
            const isPlanDisabled = (plan.id === 'starter' && !starterCompatible) || 
                                   (plan.id === 'pro' && !proCompatible);
            
            if (!currentPlan) return null; // Ne pas afficher si le plan n'existe pas en DB
            
            return (
                <Card 
                key={plan.id}
                className={`relative border-2 rounded-2xl hover:shadow-lg transition-shadow ${
                  isActive 
                    ? 'border-green-500 bg-green-50/50' 
                    : isPlanDisabled
                    ? 'border-gray-200 bg-gray-50/50 opacity-60'
                    : 'border-gray-200'
                }`}
              >
                {isActive && (
                  <Badge 
                    className="absolute -top-3 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium"
                  >
                    ✓ Abonnement actif
                  </Badge>
                )}
                {plan.isPopular && !isActive && (
                  <Badge 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full"
                  >
                    ⭐ Le Plus populaire
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-6 pt-8">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full bg-blue-100">
                      <IconComponent className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  
                  <CardTitle className="text-2xl font-bold text-foreground mb-4">
                    {plan.title}
                  </CardTitle>
                  
                  <div className="mb-2">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-foreground">
                        {formatPrice(currentPlan.price, currentPlan.currency)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      par {isAnnual ? 'an' : 'mois'}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-6 pb-8">
                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={`rounded-full p-1 mt-0.5 ${
                          feature.included ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {feature.included ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <X className="h-3 w-3 text-red-600" />
                          )}
                        </div>
                        <span className="text-sm text-foreground leading-relaxed">
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {isPlanDisabled && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-orange-800 text-center">
                        Ce plan n'est plus disponible car vous avez dépassé ses limites
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={() => handleChoosePlan(plan.id)}
                    disabled={isPlanDisabled || !!activeSubscription}
                    className={`w-full font-semibold py-3 rounded-lg ${
                      activeSubscription
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed opacity-60' 
                        : isPlanDisabled 
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {activeSubscription
                      ? "ABONNEMENT EN COURS"
                      : isPlanDisabled 
                      ? "NON DISPONIBLE"
                      : isCreatingCheckout === plan.id 
                      ? "Redirection en cours..." 
                      : "CHOISIR LE PLAN"
                    }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              📋 Informations importantes
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 rounded-full p-1 mt-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Essai gratuit de 30 jours dès l'inscription
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-100 rounded-full p-1 mt-1">
                    <Shield className="h-4 w-4 text-yellow-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Notifications 5 jours avant expiration
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 rounded-full p-1 mt-1">
                    <Star className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {isAnnual ? `Économisez jusqu'à ${calculateSavings("40 000 FCFA", "359 000 FCFA")}% par rapport au mensuel` : "Accès complet à toutes les fonctionnalités pendant la période active"}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-purple-100 rounded-full p-1 mt-1">
                    <Check className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Accès complet à toutes les fonctionnalités pendant la période active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Abonnement;