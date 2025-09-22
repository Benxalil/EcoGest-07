
import { Sidebar } from "./Sidebar";
import { UserProfile } from "./UserProfile";
import { HeaderLanguageSelector } from "./HeaderLanguageSelector";
import { HeaderNotifications } from "./HeaderNotifications";
import { HeaderDarkMode } from "./HeaderDarkMode";
import { SchoolInfo } from "./SchoolInfo";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionBlocker } from "@/components/subscription/SubscriptionBlocker";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // Lire l'état initial depuis localStorage pour synchroniser avec le Sidebar
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const isMobile = useIsMobile();
  const { subscriptionStatus } = useSubscription();

  const handleSidebarToggle = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar onToggle={handleSidebarToggle} />
      
      {/* Header avec les informations de l'école connectée */}
      <header className={`fixed top-0 right-0 z-30 bg-white shadow-sm border-b transition-all duration-200 ${
        isMobile 
          ? 'left-0 p-2 pl-12' 
          : isSidebarCollapsed 
            ? 'left-20 p-4' 
            : 'left-64 p-4'
      } ${subscriptionStatus.isExpired ? 'pt-14' : ''}`}>
        <div className="flex items-center justify-end w-full">
          {/* Tous les éléments alignés à droite avec espacement réduit */}
          <div className="flex items-center space-x-1">
            {/* Mode nuit */}
            <HeaderDarkMode />
            
            {/* Notifications */}
            <HeaderNotifications />
            
            {/* Sélecteur de langue */}
            <HeaderLanguageSelector />
            
            {/* Photo de profil */}
            <UserProfile />
            
            {/* Informations de l'école */}
            <SchoolInfo />
          </div>
        </div>
      </header>

      <main className={`transition-all duration-200 animate-fade-in ${
        isMobile 
          ? 'ml-0 p-4 pt-16' 
          : isSidebarCollapsed 
            ? 'ml-20 p-8 pt-20' 
            : 'ml-64 p-8 pt-20'
      } ${subscriptionStatus.isExpired ? 'pt-28' : ''}`}>
        {children}
      </main>

      {/* Système de blocage quand l'abonnement expire */}
      {subscriptionStatus.isExpired && <SubscriptionBlocker />}
    </div>
  );
}
