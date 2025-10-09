import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { EyeIcon, EyeOffIcon, Mail, Lock, User, UserCircle, Building2, Info } from "lucide-react";
import { EcoGestFullLogo } from "@/assets/EcoGestLogo";
import { useToast } from "@/hooks/use-toast";
import { parseUserIdentifier, buildAuthEmail } from "@/config/schoolConfig";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";

const AuthPage = () => {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<"admin" | "user">("user");

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
      if (loginType === "admin") {
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

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: loginData.password,
      });

      if (error) {
        console.error("Login error:", error);

        let errorMessage = error.message;
        if (error.message.includes("Email not confirmed")) {
          errorMessage = "Veuillez confirmer votre email avant de vous connecter.";
        } else if (error.message.includes("Invalid login credentials")) {
          errorMessage =
            loginType === "admin"
              ? "Email ou mot de passe incorrect."
              : "Matricule, école ou mot de passe incorrect. Vérifiez votre identifiant au format: matricule@suffixe_école";
        }

        toast({
          title: "Erreur de connexion",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        // Attendre que la session soit complètement établie
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          toast({
            title: "Connexion réussie",
            description: "Bienvenue !",
          });
          
          // Utiliser navigate au lieu de window.location.href
          // Petit délai pour s'assurer que la session est persistée
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 100);
        } else {
          toast({
            title: "Erreur",
            description: "Impossible d'établir la session. Veuillez réessayer.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Login error:", error);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 sm:p-6 md:p-8 relative">
      {/* Toggle mode sombre */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-4 right-4 rounded-full"
      >
        {theme === "dark" ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-slate-700" />}
      </Button>

      <Card className="w-full max-w-md shadow-xl border-0 bg-card/95 backdrop-blur-sm">
        {/* Logo complet centré */}
        <div className="pt-8 pb-6 flex justify-center">
          <EcoGestFullLogo height={30} />
        </div>

        <CardContent className="px-6 pb-8">
          {/* Sélecteur simplifié */}
          <div className="mb-6">
            <div className="flex justify-center gap-8">
              <button
                type="button"
                onClick={() => setLoginType("user")}
                className="flex flex-col items-center justify-center transition-colors duration-300"
              >
                <UserCircle
                  className={cn(
                    "h-10 w-10 mb-2 transition-colors duration-300",
                    loginType === "user" ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "text-sm",
                    loginType === "user" ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  Utilisateur
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLoginType("admin")}
                className="flex flex-col items-center justify-center transition-colors duration-300"
              >
                <Building2
                  className={cn(
                    "h-10 w-10 mb-2 transition-colors duration-300",
                    loginType === "admin" ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "text-sm",
                    loginType === "admin" ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  Administrateur
                </span>
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Champ identifiant selon le type */}
            <div className="space-y-2 animate-fade-in">
              {loginType === "user" ? (
                <>
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
                </>
              ) : (
                <>
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
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={loginType === "admin" ? "••••••••" : "Mot de passe par défaut"}
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
              {loginType === "user" && (
                <p className="text-xs text-muted-foreground">
                  Utilisez le mot de passe fourni lors de la création de votre compte
                </p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isLoading}>
              {isLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          {/* Message contextuel avec animation */}
          <div
            key={loginType}
            className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 animate-fade-in"
          >
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
                {loginType === "user" ? (
                  <>
                    <p className="font-medium">
                      🔹 Cet espace est réservé uniquement aux élèves, parents et enseignants.
                    </p>
                    <p>
                      🔹 Si vous êtes nouveau ici, veuillez contacter votre administrateur pour obtenir vos identifiants
                      de connexion.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">🔹 Cet espace est réservé uniquement aux administrateurs d'école.</p>
                    <p>🔹 Vous pouvez vous connecter avec vos identifiants de direction ou d'administration.</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link to="/inscription" className="font-medium text-primary hover:underline">
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
