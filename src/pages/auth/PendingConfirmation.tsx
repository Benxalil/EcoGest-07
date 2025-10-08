import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PendingConfirmation = () => {
  const navigate = useNavigate();
  
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
              📧 Un email a été envoyé à l'adresse que vous avez fournie.
            </p>
            <p className="text-sm text-muted-foreground">
              ⏱️ Le lien est valide pendant 24 heures.
            </p>
            <p className="text-sm text-muted-foreground">
              🔄 Une fois confirmé, vous serez automatiquement redirigé pour finaliser la création de votre école.
            </p>
          </div>
          
          <div className="pt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas reçu l'email ? Vérifiez votre dossier spam.
            </p>
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
