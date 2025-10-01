import React, { useState, useEffect } from "react";
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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<'admin' | 'user'>('user');

  // Login form state
  const [loginData, setLoginData] = useState({
    identifier: "",
    password: "",
  });
  
  const [schoolSuffix, setSchoolSuffix] = useState<string>("");

  // Récupérer le suffixe d'école au chargement
  useEffect(() => {
    const fetchSchoolSuffix = async () => {
      try {
        // Récupérer le premier suffixe d'école disponible (pour l'exemple de login)
        const { data, error } = await supabase
          .from('schools')
          .select('school_suffix')
          .limit(1)
          .single();
        
        if (!error && data?.school_suffix) {
          setSchoolSuffix(data.school_suffix);
        }
      } catch (error) {
        console.log('Impossible de récupérer le suffixe d\'école');
      }
    };
    
    if (loginType === 'user') {
      fetchSchoolSuffix();
    }
  }, [loginType]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let email = loginData.identifier;
      
      // Système hybride d'authentification
      if (loginType === 'admin') {
        // Admin: email classique (doit contenir @)
        if (!loginData.identifier.includes('@')) {
          toast({
            title: "Format d'email incorrect",
            description: "Les administrateurs doivent se connecter avec un email valide",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        email = loginData.identifier.trim().toLowerCase();
      } else {
        // Utilisateur: matricule simple (Prof03, Eleve001, etc.)
        const matricule = loginData.identifier.trim();
        
        // Vérifier que le school_suffix est disponible
        if (!schoolSuffix) {
          toast({
            title: "Erreur de configuration",
            description: "Impossible de récupérer les informations de l'école",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        // Transformer en email valide pour Supabase Auth
        // Ex: Prof03 + ecole_best -> Prof03@ecole-best.ecogest.app
        const validDomain = schoolSuffix.replace(/_/g, '-') + '.ecogest.app';
        email = `${matricule}@${validDomain}`;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: loginData.password,
      });

      if (error) {
        console.error('Login error:', error);
        if (error.message.includes('Email not confirmed')) {
          toast({
            title: "Email non confirmé",
            description: "Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.",
            variant: "destructive",
          });
        } else if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Identifiants incorrects",
            description: loginType === 'admin' 
              ? 'Email ou mot de passe incorrect.' 
              : `Matricule ou mot de passe incorrect. Format attendu: ${loginType === 'user' ? 'Prof03 ou Eleve001' : 'votre matricule'}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur de connexion",
            description: error.message,
            variant: "destructive",
          });
        }
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
                  <Label htmlFor="login-identifier">Matricule</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-identifier"
                      type="text"
                      placeholder="Prof03, Eleve001, Parent001..."
                      value={loginData.identifier}
                      onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Entrez simplement votre matricule (ex: Prof03, Eleve001)
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