import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

export const SubscriptionAlert = () => {
  const navigate = useNavigate();
  const { subscriptionStatus } = useSubscription();

  if (!subscriptionStatus.showWarning && !subscriptionStatus.isExpired) {
    return null;
  }

  const handleGoToSubscription = () => {
    navigate("/abonnement");
  };

  if (subscriptionStatus.isExpired) {
    // Quand expiré, ne pas afficher l'alerte normale car on utilise le blocker
    return null;
  }

  return (
    <Alert className="bg-orange-50 border-orange-200 mb-6">
      <Clock className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <span className="text-orange-800 font-medium">
            Attention ! Il vous reste {subscriptionStatus.daysRemaining} jour{subscriptionStatus.daysRemaining > 1 ? 's' : ''} 
          </span>
          <span className="text-orange-700 ml-2">
            avant la fin de votre période d'essai gratuite de 30 jours.
          </span>
        </div>
        <Button 
          onClick={handleGoToSubscription}
          variant="outline"
          className="ml-4 border-orange-200 text-orange-700 hover:bg-orange-100"
          size="sm"
        >
          <Star className="h-4 w-4 mr-2" />
          Voir les plans
        </Button>
      </AlertDescription>
    </Alert>
  );
};