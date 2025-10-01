import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { EyeIcon, EyeOffIcon, Mail, Lock, User } from "lucide-react";
import { EcoGestLogo } from "@/assets/EcoGestLogo";
import { useToast } from "@/hooks/use-toast";
import { parseUserIdentifier, buildAuthEmail } from "@/config/schoolConfig";

const AuthPage = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<'admin' | 'user'>('user');

  const [loginData, setLoginData] = useState({
    identifier: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let email = loginData.identifier;
      
      // Système d'authentification multi-écoles
      if (loginType === 'admin') {
        // Admin: email classique
        email = loginData.identifier.trim();
      } else {
        // Utilisateur: format matricule@suffixe_école (ex: Prof04@ecole-best)
        const identifier = loginData.identifier.trim();
        
        // Parser l'identifiant
        const parsed = parseUserIdentifier(identifier);
        
        if (!parsed) {
          toast({
            title: "Format invalide",
            description: "Veuillez utiliser le format: matricule@suffixe_école (ex: Prof04@ecole-best)",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        // Construire l'email technique pour Supabase Auth
        // Ex: Prof04@ecole-best -> Prof04@ecole-best.ecogest.app
        email = buildAuthEmail(parsed.matricule, parsed.schoolSuffix);
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: loginData.password,
      });

      if (error) {
        console.error('Login error:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('Email not confirmed')) {
          errorMessage = "Veuillez confirmer votre email avant de vous connecter.";
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = loginType === 'admin' 
            ? 'Email ou mot de passe incorrect.' 
            : 'Matricule, école ou mot de passe incorrect. Vérifiez votre identifiant au format: matricule@suffixe_école';
        }
        
        toast({
          title: "Erreur de connexion",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connexion réussie",
          description: "Bienvenue !",
        });
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la connexion.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <EcoGestLogo size={48} />
          </div>
          <CardTitle className="text-2xl font-bold">EcoGest</CardTitle>
          <CardDescription>
            Système de gestion scolaire
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={loginType} onValueChange={(value) => setLoginType(value as 'admin' | 'user')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="user">Utilisateur</TabsTrigger>
              <TabsTrigger value="admin">Administrateur</TabsTrigger>
            </TabsList>

            <form onSubmit={handleLogin} className="space-y-4">
              <TabsContent value="user" className="mt-0">
                <div className="space-y-2">
                  <Label htmlFor="login-identifier">Identifiant</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-identifier"
                      type="text"
                      placeholder="Prof04@ecole-best"
                      value={loginData.identifier}
                      onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Format: matricule@suffixe_école (ex: Prof04@ecole-best, Eleve001@mon-lycee)
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="admin" className="mt-0">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="admin@exemple.com"
                      value={loginData.identifier}
                      onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </TabsContent>
              
              <div className="space-y-2">
                <Label htmlFor="login-password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={loginType === 'admin' ? "••••••••" : "Mot de passe par défaut"}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {loginType === 'user' && (
                  <p className="text-xs text-muted-foreground">
                    Utilisez le mot de passe fourni lors de la création de votre compte
                  </p>
                )}
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </Tabs>
          
          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link 
                to="/inscription" 
                className="font-medium text-primary hover:underline"
              >
                Créez votre école ici
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
