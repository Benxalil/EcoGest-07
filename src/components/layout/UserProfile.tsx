import { User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedUserData } from "@/hooks/useUnifiedUserData";

interface UserProfileProps {
  userPhoto?: string;
  userName?: string;
  className?: string;
}

export function UserProfile({
  userPhoto,
  userName = "Utilisateur",
  className = ""
}: UserProfileProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, loading } = useUnifiedUserData();
  
  // Afficher directement les données du cache - pas d'écran vide
  const userProfile = profile;

  const handleLogout = async () => {
    try {
      // Utiliser scope local pour éviter les erreurs 403
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      // Même en cas d'erreur (session invalide), on redirige vers la page de connexion
      if (error) {
        console.warn('Erreur de déconnexion (ignorée):', error.message);
      }
      
      // Nettoyer le localStorage
      localStorage.clear();
      
      // Toujours rediriger vers la page de connexion
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
      
      // Rediriger et forcer le rechargement pour nettoyer l'état
      window.location.href = "/auth";
    } catch (error) {
      console.error('Erreur inattendue lors de la déconnexion:', error);
      // Même en cas d'erreur, on déconnecte localement
      localStorage.clear();
      window.location.href = "/auth";
    }
  };

  const displayName = userProfile?.firstName && userProfile?.lastName 
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : userName;

  const initials = displayName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "school_admin": return "Administrateur";
      case "teacher": return "Enseignant";
      case "student": return "Élève";
      case "parent": return "Parent";
      default: return role;
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userPhoto} alt={displayName} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              {userProfile?.role && (
                <p className="text-xs leading-none text-muted-foreground">
                  {getRoleLabel(userProfile.role)}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/parametres")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Paramètres</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Se déconnecter</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}