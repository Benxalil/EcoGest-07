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

const AuthPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<'admin' | 'user'>('user');
  const { toast } = useToast();

  // Login form state
  const [loginData, setLoginData] = useState({
    identifier: "",
    password: "",
  });



  const formatIdentifierToEmail = (identifier: string): string => {
    // If it's already an email format (admin), return as is
    if (identifier.includes('@') && identifier.includes('.')) {
      return identifier;
    }
    
    // For user identifiers, we need to add the school suffix
    // This will be handled when we have school context
    return identifier;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let email = loginData.identifier;
      
      // Validation basique du format d'identifiant pour les utilisateurs
      if (loginType === 'user') {
        const identifierRegex = /^(Eleve|Prof|Parent|Admin)\d{3}@[a-z0-9-]+\.ecogest\.app$/;
        if (!identifierRegex.test(loginData.identifier)) {
          toast({
            title: "Format incorrect",
            description: "L'identifiant doit être au format: Role000@ecole.ecogest.app",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }
      
      // Format identifier based on login type
      if (loginType === 'admin') {
        // Admin login - use identifier as is (should be email)
        email = loginData.identifier;
      } else {
        // User login - use the identifier as is (already formatted as email)
        email = loginData.identifier;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: loginData.password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          alert('Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.');
        } else if (error.message.includes('Invalid login credentials')) {
          alert(loginType === 'admin' ? 'Email ou mot de passe incorrect.' : 'Identifiant ou mot de passe incorrect.');
        } else {
          alert('Erreur de connexion: ' + error.message);
        }
      } else {
        // Successful login - user will be redirected by AuthenticatedLayout
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Une erreur est survenue lors de la connexion.');
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
                      placeholder="ELEVE001@ecole_best"
                      value={loginData.identifier}
                      onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Utilisez votre identifiant complet (ex: ELEVE001@ecole_best)
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
                    Mot de passe par défaut : student123, teacher123 ou parent123
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