import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PendingConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userEmail = location.state?.email || "votre adresse email";
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleResendEmail = async () => {
    if (cooldown > 0) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });
      
      if (error) throw error;
      
      toast({
        title: "Email renvoyé",
        description: "Un nouveau lien de confirmation a été envoyé à votre adresse email.",
      });
      
      // Activer le cooldown de 60 secondes
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Erreur lors du renvoi:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de renvoyer l'email. Veuillez réessayer plus tard.",
      });
    } finally {
      setIsResending(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Email de confirmation envoyé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-base">
            Consultez votre boîte email et cliquez sur le lien de confirmation pour activer votre compte.
          </p>
          
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">
              📧 Un email a été envoyé à : <strong>{userEmail}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              ⏱️ Le lien est valide pendant 24 heures.
            </p>
            <p className="text-sm text-muted-foreground">
              🔄 Une fois confirmé, vous serez automatiquement redirigé pour finaliser la création de votre école.
            </p>
          </div>
          
          <div className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas reçu l'email ? Vérifiez votre dossier spam.
            </p>
            
            <Button
              variant="default"
              onClick={handleResendEmail}
              disabled={isResending || cooldown > 0}
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : cooldown > 0 ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Renvoyer dans {cooldown}s
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Renvoyer l'email de confirmation
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => navigate('/inscription')}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'inscription
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingConfirmation;
