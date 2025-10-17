import { useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, School, BookOpen, Settings, Menu, X, ChevronDown, ChevronRight, Calendar, CreditCard, LayoutDashboard, GraduationCap, Bookmark, Building2, BarChart, ChevronUp, ClipboardList, Megaphone, UserCheck, LogOut } from "lucide-react";
import { clearAllCacheOnLogout } from "@/utils/securityCleanup";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarToggle } from "./SidebarToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EcoGestLogo, EcoGestFullLogo } from "@/assets/EcoGestLogo";
import { useSubscription } from "@/hooks/useSubscription";
import { useUnifiedUserData } from "@/hooks/useUnifiedUserData";
interface MenuItem {
  title: string;
  icon: any;
  path: string;
  adminOnly?: boolean;
  teacherAccess?: boolean;
  studentAccess?: boolean;
  parentAccess?: boolean;
}

const allMenuItems: MenuItem[] = [{
  title: "Tableau de Bord",
  icon: LayoutDashboard,
  path: "/",
  teacherAccess: true,
  studentAccess: true,
  parentAccess: true
}, {
  title: "Classes",
  icon: School,
  path: "/classes",
  adminOnly: true,
  teacherAccess: true
}, {
  title: "Élèves",
  icon: Users,
  path: "/eleves",
  teacherAccess: true,
  studentAccess: true,
  parentAccess: true
}, {
  title: "Enseignants",
  icon: GraduationCap,
  path: "/enseignants",
  adminOnly: true
}, {
  title: "Matières",
  icon: BookOpen,
  path: "/matieres",
  adminOnly: true,
  studentAccess: true
}, {
  title: "Emplois du temps",
  icon: Calendar,
  path: "/emplois-du-temps",
  teacherAccess: true,
  studentAccess: true,
  parentAccess: true
}, {
  title: "Paiements",
  icon: CreditCard,
  path: "/paiements",
  adminOnly: true,
  studentAccess: true,
  parentAccess: true
}, {
  title: "Annonces",
  icon: Megaphone,
  path: "/annonces",
  teacherAccess: true,
  studentAccess: true,
  parentAccess: true
}, {
  title: "Examens",
  icon: BookOpen,
  path: "/examens",
  adminOnly: true
}, {
  title: "Notes",
  icon: ClipboardList,
  path: "/notes",
  teacherAccess: true
}, {
  title: "Résultats",
  icon: BarChart,
  path: "/resultats",
  adminOnly: true,
  studentAccess: true,
  parentAccess: true
}, {
  title: "Utilisateurs",
  icon: UserCheck,
  path: "/utilisateurs",
  adminOnly: true
}, {
  title: "Paramètres",
  icon: Settings,
  path: "/parametres",
  teacherAccess: true,
  studentAccess: true,
  parentAccess: true
}, {
  title: "Abonnement",
  icon: Bookmark,
  path: "/abonnement",
  adminOnly: true
}];
interface SidebarProps {
  onToggle?: (collapsed: boolean) => void;
}
export function Sidebar({
  onToggle
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Lire l'état initial depuis localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { subscriptionStatus } = useSubscription();
  const { profile, isAdmin, isTeacher, isStudent, isParent } = useUnifiedUserData();

  // Filtrer les éléments du menu selon le rôle - Afficher immédiatement depuis le cache
  const menuItems = useMemo(() => {
    // Si pas de profil, afficher le menu de base (dashboard uniquement)
    if (!profile) {
      return [{
        title: "Tableau de Bord",
        icon: LayoutDashboard,
        path: "/",
        teacherAccess: true,
        studentAccess: true,
        parentAccess: true
      }];
    }
    
    if (isAdmin()) {
      return allMenuItems; // Les admins voient tout
    }
    
    if (isTeacher()) {
      return allMenuItems.filter(item => item.teacherAccess || false);
    }
    
    if (isStudent()) {
      return allMenuItems.filter(item => item.studentAccess || false);
    }
    
    if (isParent()) {
      return allMenuItems.filter(item => item.parentAccess || false);
    }
    
    return [];
  }, [profile, isAdmin, isTeacher, isStudent, isParent]);
  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    // Sauvegarder l'état dans localStorage
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newCollapsed));
    onToggle?.(newCollapsed);
  };
  const isActiveRoute = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };
  const handleLinkClick = (e: React.MouseEvent, path: string) => {
    if (isMobile) {
      setIsOpen(false);
    }
    
    // Si l'abonnement est expiré et que ce n'est pas la page abonnement ou paramètres, empêcher la navigation
    if (subscriptionStatus.isExpired && path !== "/abonnement" && path !== "/parametres") {
      e.preventDefault();
      e.stopPropagation();
      
      // Faire clignoter le message d'expiration
      const message = document.getElementById('expiry-message');
      if (message) {
        message.classList.add('animate-pulse');
        setTimeout(() => {
          message.classList.remove('animate-pulse');
        }, 1000);
      }
      return;
    }
    
    // Navigation normale si pas expiré ou si c'est la page abonnement
    navigate(path);
  };

  return <>
        {/* Overlay pour fermer la sidebar sur mobile */}
        {isMobile && isOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30" 
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Bouton pour ouvrir la sidebar sur mobile */}
        {isMobile && !isOpen && (
          <Button 
            variant="ghost" 
            size="sm"
            className="fixed top-2 left-2 z-50 bg-sidebar/90 backdrop-blur-sm shadow-md" 
            onClick={() => setIsOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

      <div className={cn("fixed inset-y-0 left-0 transform bg-sidebar shadow-lg transition-all duration-300 ease-in-out flex flex-col", {
        "-translate-x-full": isMobile && !isOpen,
        "translate-x-0": !isMobile || isOpen,
        "w-64": !isMobile && !isCollapsed,
        "w-20": !isMobile && isCollapsed,
        "w-80": isMobile,
        "z-40": true
      })}>
          <div className={cn("flex-shrink-0 my-2 mx-[4px]", {
            "p-4 px-[26px] py-px": !isCollapsed || isMobile,
            "px-2 py-1": isCollapsed && !isMobile
          })}>
          <div className="flex items-center justify-between mb-4">
            <SidebarToggle isCollapsed={isCollapsed && !isMobile} onToggle={toggleCollapse} />
            
            {/* Bouton fermer pour mobile */}
            {isMobile && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsOpen(false)}
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Header avec logo et nom de la société */}
          <div className={cn("mb-3 pb-2 border-b border-sidebar-border", {
            "text-center": isCollapsed && !isMobile
          })}>
            {(isCollapsed && !isMobile) ? (
              <div className="flex justify-center">
                <EcoGestLogo size={64} />
              </div>
            ) : (
              <EcoGestFullLogo height={50} />
            )}
          </div>
        </div>
        
        {/* Menu items with scroll area */}
        <div className="flex-1 overflow-hidden mx-0 py-0 my-0 px-[14px]">
          <ScrollArea className="h-full">
            <div id="sidebar-menu-container" className="space-y-2">
              {menuItems.map(item => (
                <div key={item.title} className="space-y-2">
                  <div
                    onClick={(e) => handleLinkClick(e, item.path)}
                    className={cn("flex items-center space-x-2 rounded-md p-2 transition-colors cursor-pointer", {
                      "bg-blue-50 dark:bg-blue-950/30 text-primary font-medium": isActiveRoute(item.path),
                      "text-sidebar-foreground hover:bg-sidebar-accent/50": !isActiveRoute(item.path)
                    })}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className={cn({
                      "hidden": isCollapsed && !isMobile
                    })}>
                      {item.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Section de déconnexion en bas */}
        <div className="flex-shrink-0 border-t border-border p-4">
          <Button
            variant="ghost"
            onClick={async () => {
              await clearAllCacheOnLogout();
              navigate("/auth");
            }}
            className={cn(
              "w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors",
              {
                "justify-center px-2": isCollapsed && !isMobile
              }
            )}
          >
            <LogOut className="h-5 w-5" />
            <span className={cn("ml-2", {
              "hidden": isCollapsed && !isMobile
            })}>
              Déconnexion
            </span>
          </Button>
        </div>
      </div>
    </>;
}