import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const EmailVerified = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Email vérifié avec succès !</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-base">
            Votre adresse email a bien été confirmée. Bienvenue sur EcoGest !
          </p>
          
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              ✅ Votre compte est maintenant actif
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              🔄 Redirection automatique dans {countdown} seconde{countdown > 1 ? 's' : ''}...
            </p>
          </div>
          
          <Button
            onClick={() => navigate('/')}
            className="w-full"
          >
            Continuer vers le tableau de bord
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerified;
